using FreneticUtilities.FreneticExtensions;
using FreneticUtilities.FreneticToolkit;
using Newtonsoft.Json.Linq;
using SwarmUI.Accounts;
using SwarmUI.Core;
using SwarmUI.Text2Image;
using SwarmUI.Utils;
using SwarmUI.WebAPI;
using SwarmUI.Builtin_ComfyUIBackend;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace SwarmUI.Builtin_Extensions.RandomImageCycler;

/// <summary>Extension that provides random image cycling functionality for batch processing.</summary>
public class RandomImageCyclerExtension : Extension
{
    public static T2IRegisteredParam<string> ImageFolderPath, CycleMode;
    public static T2IRegisteredParam<int> CycleCount;
    public static T2IRegisteredParam<bool> EnableRandomCycle, ShuffleOnStart;
    public static T2IParamGroup RandomCyclerGroup;
    
    private static readonly Random random = new();
    private static Dictionary<string, List<string>> folderImageCache = new();
    private static Dictionary<string, int> currentIndexMap = new();
    private static Dictionary<string, List<string>> shuffledListMap = new();

    public override void OnInit()
    {
        // Register JavaScript for UI enhancements
        ScriptFiles.Add("Assets/randomcycler.js");
        
        // Create parameter group
        RandomCyclerGroup = new("Random Image Cycler", Toggles: true, Open: false, IsAdvanced: true);
        
        // Register T2I parameters for the random image cycler
        EnableRandomCycle = T2IParamTypes.Register<bool>(new("Enable Random Cycler", 
            "Enable the random image cycler for batch processing",
            "false", 
            Group: RandomCyclerGroup,
            IsAdvanced: true,
            OrderPriority: 1
        ));
        
        ImageFolderPath = T2IParamTypes.Register<string>(new("Image Folder Path",
            "Path to folder containing images to cycle through",
            "",
            Group: RandomCyclerGroup,
            IsAdvanced: true,
            OrderPriority: 2,
            GetValues: (session) =>
            {
                List<string> folders = new();
                string outputPath = session.User.OutputDirectory;
                if (Directory.Exists(outputPath))
                {
                    folders.AddRange(Directory.GetDirectories(outputPath).Select(d => Path.GetFileName(d)));
                }
                return folders;
            }
        ));

        CycleMode = T2IParamTypes.Register<string>(new("Cycle Mode",
            "How to cycle through images: Sequential, Random, or Shuffle",
            "Sequential",
            Group: RandomCyclerGroup,
            IsAdvanced: true,
            OrderPriority: 3,
            GetValues: (_) => ["Sequential", "Random", "Shuffle"]
        ));

        CycleCount = T2IParamTypes.Register<int>(new("Cycle Count",
            "Number of images to cycle through per batch (0 = all)",
            "0",
            Min: 0,
            Max: 1000,
            Group: RandomCyclerGroup,
            IsAdvanced: true,
            OrderPriority: 4
        ));

        ShuffleOnStart = T2IParamTypes.Register<bool>(new("Shuffle on Start",
            "Shuffle the image list when starting a new batch",
            "true",
            Group: RandomCyclerGroup,
            IsAdvanced: true,
            OrderPriority: 5
        ));

        // Register API endpoints with proper permissions
        API.RegisterAPICall(GetNextImage, false, Permissions.EditParams);
        API.RegisterAPICall(ResetCycler, false, Permissions.EditParams);
        API.RegisterAPICall(GetFolderImages, false, Permissions.ViewImageHistory);
        API.RegisterAPICall(GetImageData, false, Permissions.ViewImageHistory);
        
        // Register pre-generate event to inject images into user input
        T2IEngine.PreGenerateEvent += OnPreGenerate;
        
        // Also use workflow generator for ComfyUI-specific handling
        WorkflowGenerator.AddStep(g =>
        {
            // This can be used for ComfyUI-specific workflow modifications if needed
            if (g.UserInput.TryGet(EnableRandomCycle, out bool enabled) && enabled)
            {
                // The image injection happens in PreGenerateEvent
                // This is here for potential future ComfyUI-specific workflow modifications
                if (g.UserInput.ExtraMeta.TryGetValue("randomcycler_image", out object imageName))
                {
                    Logs.Verbose($"RandomImageCycler: Workflow includes cycled image {imageName}");
                }
            }
        }, -50); // Run early in the workflow
        
        Logs.Init($"RandomImageCycler extension initialized successfully!");
    }

    /// <summary>Pre-generate event to inject random image into user input.</summary>
    public static void OnPreGenerate(T2IEngine.PreGenerationEventParams args)
    {
        if (!args.UserInput.TryGet(EnableRandomCycle, out bool enabled) || !enabled)
        {
            Logs.Verbose("RandomImageCycler: Not enabled, skipping");
            return;
        }

        Logs.Info("RandomImageCycler: Starting image injection");

        string folderPath = args.UserInput.Get(ImageFolderPath, "");
        if (string.IsNullOrWhiteSpace(folderPath))
        {
            Logs.Warning("RandomImageCycler: No folder path specified");
            return;
        }

        // Get the full path
        Session session = args.UserInput.SourceSession;
        if (session == null)
        {
            Logs.Warning("RandomImageCycler: No session available");
            return;
        }
        
        // Try both as absolute path and as subfolder of output directory
        string fullPath = folderPath;
        if (!Path.IsPathRooted(folderPath))
        {
            // For relative paths, look in the user's output directory
            fullPath = Path.Combine(session.User.OutputDirectory, folderPath);
            Logs.Info($"RandomImageCycler: Using relative path - OutputDir: {session.User.OutputDirectory}, Folder: {folderPath}, Full: {fullPath}");
        }
        else
        {
            Logs.Info($"RandomImageCycler: Using absolute path: {fullPath}");
        }
        
        if (!Directory.Exists(fullPath))
        {
            // Try alternate path construction for nested output folders
            string altPath = Path.Combine(Path.GetDirectoryName(session.User.OutputDirectory), folderPath);
            if (Directory.Exists(altPath))
            {
                fullPath = altPath;
                Logs.Info($"RandomImageCycler: Using alternate path: {fullPath}");
            }
            else
            {
                Logs.Warning($"RandomImageCycler: Folder not found at: {fullPath} or {altPath}");
                return;
            }
        }

        // Get or cache the image list
        if (!folderImageCache.ContainsKey(fullPath) || folderImageCache[fullPath].Count == 0)
        {
            RefreshFolderCache(fullPath);
        }

        List<string> images = folderImageCache[fullPath];
        if (images.Count == 0)
        {
            Logs.Warning($"RandomImageCycler: No images found in folder: {fullPath}");
            return;
        }

        string mode = args.UserInput.Get(CycleMode, "Sequential");
        bool shuffleOnStart = args.UserInput.Get(ShuffleOnStart, true);
        
        // For shuffle mode, only reshuffle on the first generation of a new batch
        // We'll pass false to GetNextImageFromList to not reshuffle every time
        bool shouldShuffle = false; // Never reshuffle mid-batch
        
        // Check if there's already an init image set by the cycler (to avoid double-loading)
        if (args.UserInput.ExtraMeta.ContainsKey("randomcycler_image_loaded"))
        {
            Logs.Verbose("RandomImageCycler: Already loaded an image this generation, skipping");
            return;
        }
        
        string selectedImage = GetNextImageFromList(fullPath, images, mode, shouldShuffle);
        
        if (!string.IsNullOrEmpty(selectedImage))
        {
            try 
            {
                // Load the image and set it as init image
                if (!File.Exists(selectedImage))
                {
                    Logs.Warning($"RandomImageCycler: Selected image file not found: {selectedImage}");
                    return;
                }
                
                byte[] imageData = File.ReadAllBytes(selectedImage);
                if (imageData.Length == 0)
                {
                    Logs.Warning($"RandomImageCycler: Selected image file is empty: {selectedImage}");
                    return;
                }
                
                string ext = Path.GetExtension(selectedImage).TrimStart('.').ToLower();
                if (ext == "jpeg") ext = "jpg";
                
                Image img = new(imageData, Image.ImageType.IMAGE, ext);
                args.UserInput.Set(T2IParamTypes.InitImage, img);
                
                // Ensure init image creativity is set if not already
                if (!args.UserInput.TryGet(T2IParamTypes.InitImageCreativity, out _))
                {
                    args.UserInput.Set(T2IParamTypes.InitImageCreativity, 0.6);
                }
                
                // Store the selected image path in metadata
                args.UserInput.ExtraMeta["randomcycler_image"] = Path.GetFileName(selectedImage);
                args.UserInput.ExtraMeta["randomcycler_image_loaded"] = "true";
                
                Logs.Info($"RandomImageCycler: Successfully loaded image: {Path.GetFileName(selectedImage)} ({imageData.Length} bytes)");
            }
            catch (Exception ex)
            {
                Logs.Error($"RandomImageCycler: Failed to load image {selectedImage}: {ex.Message}");
            }
        }
        else
        {
            Logs.Warning("RandomImageCycler: GetNextImageFromList returned null/empty");
        }
    }

    /// <summary>Get the next image from the list based on the mode.</summary>
    private static string GetNextImageFromList(string folderPath, List<string> images, string mode, bool shuffleStart)
    {
        if (images.Count == 0) return null;

        string cacheKey = $"{folderPath}_{mode}";
        
        switch (mode.ToLower())
        {
            case "random":
                return images[random.Next(images.Count)];
                
            case "shuffle":
                if (!shuffledListMap.ContainsKey(cacheKey) || shuffleStart)
                {
                    List<string> shuffled = new(images);
                    for (int i = shuffled.Count - 1; i > 0; i--)
                    {
                        int j = random.Next(i + 1);
                        (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
                    }
                    shuffledListMap[cacheKey] = shuffled;
                    currentIndexMap[cacheKey] = 0;
                }
                
                List<string> shuffledList = shuffledListMap[cacheKey];
                int shuffleIndex = currentIndexMap.GetValueOrDefault(cacheKey, 0);
                string shuffleImage = shuffledList[shuffleIndex % shuffledList.Count];
                currentIndexMap[cacheKey] = (shuffleIndex + 1) % shuffledList.Count;
                return shuffleImage;
                
            case "sequential":
            default:
                int currentIndex = currentIndexMap.GetValueOrDefault(cacheKey, 0);
                string seqImage = images[currentIndex % images.Count];
                currentIndexMap[cacheKey] = (currentIndex + 1) % images.Count;
                return seqImage;
        }
    }

    /// <summary>Refresh the cache for a folder.</summary>
    private static void RefreshFolderCache(string folderPath)
    {
        try
        {
            string[] extensions = { ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif" };
            List<string> images = Directory.GetFiles(folderPath)
                .Where(f => extensions.Contains(Path.GetExtension(f).ToLower()))
                .OrderBy(f => f)
                .ToList();
            
            folderImageCache[folderPath] = images;
            Logs.Info($"RandomImageCycler: Cached {images.Count} images from {folderPath}");
        }
        catch (Exception ex)
        {
            Logs.Error($"RandomImageCycler: Error caching folder {folderPath}: {ex.Message}");
            folderImageCache[folderPath] = new List<string>();
        }
    }

    /// <summary>API call to get the next image in the cycle.</summary>
    public async Task<JObject> GetNextImage(Session session, JObject data)
    {
        string folder = data["folder"]?.ToString() ?? "";
        string mode = data["mode"]?.ToString() ?? "Sequential";
        
        if (string.IsNullOrWhiteSpace(folder))
        {
            return new JObject() { ["error"] = "No folder specified" };
        }

        string fullPath = Path.Combine(session.User.OutputDirectory, folder);
        if (!Directory.Exists(fullPath))
        {
            return new JObject() { ["error"] = $"Folder not found: {folder}" };
        }

        if (!folderImageCache.ContainsKey(fullPath))
        {
            RefreshFolderCache(fullPath);
        }

        List<string> images = folderImageCache[fullPath];
        if (images.Count == 0)
        {
            return new JObject() { ["error"] = "No images in folder" };
        }

        string nextImage = GetNextImageFromList(fullPath, images, mode, false);
        
        return new JObject()
        {
            ["success"] = true,
            ["image"] = Path.GetFileName(nextImage),
            ["path"] = nextImage,
            ["total"] = images.Count,
            ["index"] = currentIndexMap.GetValueOrDefault($"{fullPath}_{mode}", 0)
        };
    }

    /// <summary>API call to reset the cycler state.</summary>
    public async Task<JObject> ResetCycler(Session session, JObject data)
    {
        string folder = data["folder"]?.ToString();
        
        if (string.IsNullOrWhiteSpace(folder))
        {
            // Reset all
            currentIndexMap.Clear();
            shuffledListMap.Clear();
            folderImageCache.Clear();
        }
        else
        {
            string fullPath = Path.Combine(session.User.OutputDirectory, folder);
            string[] keysToRemove = currentIndexMap.Keys
                .Where(k => k.StartsWith(fullPath))
                .ToArray();
            
            foreach (string key in keysToRemove)
            {
                currentIndexMap.Remove(key);
                shuffledListMap.Remove(key);
            }
            folderImageCache.Remove(fullPath);
        }
        
        return new JObject() { ["success"] = true };
    }

    /// <summary>API call to get list of images in a folder.</summary>
    public async Task<JObject> GetFolderImages(Session session, JObject data)
    {
        string folder = data["folder"]?.ToString() ?? "";
        
        if (string.IsNullOrWhiteSpace(folder))
        {
            return new JObject() { ["error"] = "No folder specified" };
        }

        string fullPath = Path.Combine(session.User.OutputDirectory, folder);
        if (!Directory.Exists(fullPath))
        {
            return new JObject() { ["error"] = $"Folder not found: {folder}" };
        }

        RefreshFolderCache(fullPath);
        List<string> images = folderImageCache[fullPath];
        
        JArray imageArray = new();
        foreach (string img in images)
        {
            imageArray.Add(Path.GetFileName(img));
        }
        
        return new JObject()
        {
            ["success"] = true,
            ["folder"] = folder,
            ["images"] = imageArray,
            ["count"] = images.Count
        };
    }

    /// <summary>API call to get image data as base64.</summary>
    public async Task<JObject> GetImageData(Session session, JObject data)
    {
        string imagePath = data["path"]?.ToString() ?? "";
        
        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return new JObject() { ["error"] = "No path specified" };
        }

        // Ensure the path is within the user's output directory for security
        string userDir = session.User.OutputDirectory;
        if (!imagePath.StartsWith(userDir) && !Path.IsPathRooted(imagePath))
        {
            imagePath = Path.Combine(userDir, imagePath);
        }
        
        if (!File.Exists(imagePath))
        {
            return new JObject() { ["error"] = $"File not found: {imagePath}" };
        }
        
        try
        {
            byte[] imageData = await File.ReadAllBytesAsync(imagePath);
            string ext = Path.GetExtension(imagePath).TrimStart('.').ToLower();
            if (ext == "jpeg") ext = "jpg";
            
            string base64 = Convert.ToBase64String(imageData);
            string dataUrl = $"data:image/{ext};base64,{base64}";
            
            return new JObject()
            {
                ["success"] = true,
                ["data"] = dataUrl,
                ["filename"] = Path.GetFileName(imagePath)
            };
        }
        catch (Exception ex)
        {
            return new JObject() { ["error"] = $"Failed to read image: {ex.Message}" };
        }
    }
    
    public override void OnShutdown()
    {
        T2IEngine.PreGenerateEvent -= OnPreGenerate;
        
        // Cleanup
        folderImageCache.Clear();
        currentIndexMap.Clear();
        shuffledListMap.Clear();
    }
}

using FreneticUtilities.FreneticExtensions;
using Newtonsoft.Json.Linq;
using SwarmUI.Accounts;
using SwarmUI.Core;
using SwarmUI.Text2Image;
using SwarmUI.Utils;
using SwarmUI.WebAPI;
using System.IO;

namespace SwarmUI.Builtin_RandomImageExtension;

/// <summary>Extension that adds random image selection functionality to SwarmUI.</summary>
public class RandomImageExtension : Extension
{
    public static PermInfo PermUseRandomImage = Permissions.Register(new("randimg_use_random_image", "[Random Image] Use Random Image Selector", "Allows the user to use the random image selection feature.", PermissionDefault.USER, Permissions.GroupUser));

    public override void OnPreInit()
    {
        // Add our JavaScript file to the interface
        ScriptFiles.Add("Assets/random_image.js");
        StyleSheetFiles.Add("Assets/random_image.css");
    }

    public override void OnInit()
    {
        // Register our API endpoint
        API.RegisterAPICall(SelectRandomImageAPI, true, PermUseRandomImage);
    }

    /// <summary>API endpoint to select a random image from a folder.</summary>
    public static async Task<JObject> SelectRandomImageAPI(Session session, string folder = "random_init_images", int seed = -1, string imageExtensions = "png,jpg,jpeg,bmp,tiff,webp")
    {
        try
        {
            // Parse allowed extensions
            string[] allowedExtensions = imageExtensions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            
            // Find the folder - try multiple possible locations
            string[] possiblePaths = [
                folder,
                Path.Combine(Environment.CurrentDirectory, folder),
                Path.Combine(Environment.CurrentDirectory, "..", folder),
                Path.Combine(Utilities.CombinePathWithAbsolute(Environment.CurrentDirectory, ".."), folder)
            ];
            
            string actualFolderPath = null;
            foreach (string path in possiblePaths)
            {
                if (Directory.Exists(path))
                {
                    actualFolderPath = Path.GetFullPath(path);
                    break;
                }
            }
            
            if (actualFolderPath == null)
            {
                return new JObject { ["success"] = false, ["error"] = $"Could not find folder: {folder}" };
            }
            
            // Get all image files
            List<string> imageFiles = [];
            foreach (string file in Directory.GetFiles(actualFolderPath))
            {
                string fileExt = Path.GetExtension(file)[1..].ToLowerInvariant(); // Remove dot and lowercase
                if (allowedExtensions.Contains(fileExt))
                {
                    imageFiles.Add(file);
                }
            }
            
            if (imageFiles.Count == 0)
            {
                return new JObject { ["success"] = false, ["error"] = $"No image files found in {actualFolderPath}" };
            }
            
            // Select random image
            Random random = seed == -1 ? new Random() : new Random(seed);
            string selectedImagePath = imageFiles[random.Next(imageFiles.Count)];
            string selectedFilename = Path.GetFileName(selectedImagePath);
            
            // Convert to relative path if possible
            string relativePath = selectedImagePath;
            try
            {
                string currentDir = Environment.CurrentDirectory;
                if (selectedImagePath.StartsWith(currentDir))
                {
                    relativePath = Path.GetRelativePath(currentDir, selectedImagePath);
                }
            }
            catch
            {
                // Keep absolute path if relative conversion fails
            }
            
            Logs.Info($"[RandomImageExtension] Selected random image: {selectedFilename} from {imageFiles.Count} options");
            
            return new JObject
            {
                ["success"] = true,
                ["imagePath"] = relativePath.Replace('\\', '/'),
                ["filename"] = selectedFilename,
                ["totalImages"] = imageFiles.Count
            };
        }
        catch (Exception ex)
        {
            Logs.Error($"[RandomImageExtension] Error selecting random image: {ex}");
            return new JObject { ["success"] = false, ["error"] = ex.Message };
        }
    }
}

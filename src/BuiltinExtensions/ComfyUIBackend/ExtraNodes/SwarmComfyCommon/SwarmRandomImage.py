import os
import random
import torch
import numpy as np
from PIL import Image, ImageOps
import folder_paths

class SwarmRandomImageLoader:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "random_init_images", "tooltip": "Path to folder containing random images (relative to SwarmUI root)"}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "Seed for random selection. Use -1 for truly random."}),
            },
            "optional": {
                "image_extensions": ("STRING", {"default": "png,jpg,jpeg,bmp,tiff,webp", "tooltip": "Comma-separated list of allowed image extensions"}),
            }
        }

    CATEGORY = "SwarmUI/images"
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "filename")
    FUNCTION = "load_random_image"
    DESCRIPTION = "Loads a random image from a specified folder. Perfect for random init images with wildcards!"

    def load_random_image(self, folder_path, seed, image_extensions="png,jpg,jpeg,bmp,tiff,webp"):
        # Handle seed
        if seed == -1:
            seed = random.randint(0, 2**32 - 1)
        random.seed(seed)
        
        # Parse allowed extensions
        allowed_extensions = [ext.strip().lower() for ext in image_extensions.split(',')]
        
        # Find the folder - try multiple possible locations
        possible_paths = [
            folder_path,  # Direct path
            os.path.join(folder_paths.base_path, folder_path),  # Relative to ComfyUI
            os.path.join(folder_paths.base_path, "..", folder_path),  # Relative to SwarmUI root
            os.path.join(folder_paths.base_path, "..", "..", folder_path),  # Up two levels
        ]
        
        actual_folder_path = None
        for path in possible_paths:
            if os.path.exists(path) and os.path.isdir(path):
                actual_folder_path = path
                break
        
        if actual_folder_path is None:
            raise FileNotFoundError(f"Could not find folder: {folder_path}. Tried: {possible_paths}")
        
        # Get all image files
        image_files = []
        for file in os.listdir(actual_folder_path):
            file_ext = os.path.splitext(file)[1][1:].lower()  # Remove dot and lowercase
            if file_ext in allowed_extensions:
                image_files.append(os.path.join(actual_folder_path, file))
        
        if not image_files:
            raise ValueError(f"No image files found in {actual_folder_path} with extensions: {allowed_extensions}")
        
        # Randomly select an image
        selected_image_path = random.choice(image_files)
        selected_filename = os.path.basename(selected_image_path)
        
        # Load the image
        image = Image.open(selected_image_path)
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")
        
        # Convert to tensor format expected by ComfyUI
        image_np = np.array(image).astype(np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np)[None,]
        
        print(f"[SwarmRandomImageLoader] Selected: {selected_filename}")
        
        return (image_tensor, selected_filename)

class SwarmRandomImagePath:
    @classmethod  
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "random_init_images", "tooltip": "Path to folder containing random images"}),
                "seed": ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff, "tooltip": "Seed for random selection. Use -1 for truly random."}),
            },
            "optional": {
                "image_extensions": ("STRING", {"default": "png,jpg,jpeg,bmp,tiff,webp", "tooltip": "Comma-separated list of allowed image extensions"}),
            }
        }

    CATEGORY = "SwarmUI/images"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("image_path",)
    FUNCTION = "get_random_image_path"
    DESCRIPTION = "Returns a random image path from a folder. Use with LoadImage node for more control."

    def get_random_image_path(self, folder_path, seed, image_extensions="png,jpg,jpeg,bmp,tiff,webp"):
        # Handle seed
        if seed == -1:
            seed = random.randint(0, 2**32 - 1)
        random.seed(seed)
        
        # Parse allowed extensions
        allowed_extensions = [ext.strip().lower() for ext in image_extensions.split(',')]
        
        # Find the folder
        possible_paths = [
            folder_path,
            os.path.join(folder_paths.base_path, folder_path),
            os.path.join(folder_paths.base_path, "..", folder_path),
            os.path.join(folder_paths.base_path, "..", "..", folder_path),
        ]
        
        actual_folder_path = None
        for path in possible_paths:
            if os.path.exists(path) and os.path.isdir(path):
                actual_folder_path = path
                break
        
        if actual_folder_path is None:
            raise FileNotFoundError(f"Could not find folder: {folder_path}")
        
        # Get all image files
        image_files = []
        for file in os.listdir(actual_folder_path):
            file_ext = os.path.splitext(file)[1][1:].lower()
            if file_ext in allowed_extensions:
                image_files.append(os.path.join(actual_folder_path, file))
        
        if not image_files:
            raise ValueError(f"No image files found in {actual_folder_path}")
        
        # Randomly select an image
        selected_image_path = random.choice(image_files)
        
        print(f"[SwarmRandomImagePath] Selected: {os.path.basename(selected_image_path)}")
        
        return (selected_image_path,)

# Export the nodes
NODE_CLASS_MAPPINGS = {
    "SwarmRandomImageLoader": SwarmRandomImageLoader,
    "SwarmRandomImagePath": SwarmRandomImagePath,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SwarmRandomImageLoader": "Random Image Loader",
    "SwarmRandomImagePath": "Random Image Path",
}

// Vision.js - Clipboard and image handling utilities for SwarmUI
// This file provides utilities for handling clipboard events and image paste functionality

// Global document-level paste event handler
document.addEventListener('paste', function(e) {
    // Check if clipboardData exists to avoid undefined errors
    if (!e.clipboardData || !e.clipboardData.items) {
        return;
    }
    
    // Handle image paste events for image prompting
    let items = e.clipboardData.items;
    for (let item of items) {
        if (item.kind === 'file') {
            let file = item.getAsFile();
            if (file && file.type.startsWith('image/')) {
                // Check if we have the imagePromptAddImage function available
                if (typeof imagePromptAddImage === 'function') {
                    imagePromptAddImage(file);
                }
            }
        }
    }
});

// Export functions for other scripts to use
window.visionUtils = {
    // Utility function to safely get clipboard data
    getClipboardData: function(event) {
        return event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData);
    },
    
    // Utility function to check if clipboard has image data
    hasImageInClipboard: function(event) {
        let clipboardData = this.getClipboardData(event);
        if (!clipboardData || !clipboardData.items) {
            return false;
        }
        
        for (let item of clipboardData.items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                return true;
            }
        }
        return false;
    },
    
    // Utility function to get image files from clipboard
    getImageFilesFromClipboard: function(event) {
        let clipboardData = this.getClipboardData(event);
        let imageFiles = [];
        
        if (!clipboardData || !clipboardData.items) {
            return imageFiles;
        }
        
        for (let item of clipboardData.items) {
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                let file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }
        
        return imageFiles;
    }
};

console.log('Vision.js loaded - clipboard handling utilities initialized');

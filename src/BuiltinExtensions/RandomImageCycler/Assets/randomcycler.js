// Random Image Cycler UI Extension

class RandomImageCyclerUI {
    constructor() {
        this.currentImagePath = '';
        this.initUI();
    }

    initUI() {
        // Wait for the UI to be ready
        setTimeout(() => {
            this.addUIElements();
            // Check again every second in case UI updates
            setInterval(() => this.addUIElements(), 1000);
        }, 1000);
    }

    addUIElements() {
        // Find the Random Image Cycler group
        let folderInput = document.getElementById('input_randomcycler_folder_path');
        if (!folderInput) {
            return;
        }

        // Check if our UI already exists
        if (document.getElementById('randomcycler_preview_container')) {
            return;
        }

        // Find the parent container
        let parentContainer = folderInput.closest('.sui-popover-model-section');
        if (!parentContainer) {
            return;
        }

        // Create preview container
        let previewContainer = document.createElement('div');
        previewContainer.id = 'randomcycler_preview_container';
        previewContainer.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 5px;
            background: var(--background-color);
        `;

        // Create button row
        let buttonRow = document.createElement('div');
        buttonRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px;';

        // Create load button
        let loadButton = document.createElement('button');
        loadButton.className = 'btn btn-primary';
        loadButton.innerHTML = '🎲 Load Random Image';
        loadButton.style.flex = '1';
        loadButton.onclick = () => this.loadRandomImage();

        // Create reset button
        let resetButton = document.createElement('button');
        resetButton.className = 'btn btn-secondary';
        resetButton.innerHTML = '🔄 Reset Counter';
        resetButton.style.flex = '1';
        resetButton.onclick = () => this.resetCycler();

        buttonRow.appendChild(loadButton);
        buttonRow.appendChild(resetButton);

        // Create info display
        let infoDisplay = document.createElement('div');
        infoDisplay.id = 'randomcycler_info';
        infoDisplay.style.cssText = `
            padding: 5px;
            margin-bottom: 10px;
            font-size: 0.9em;
            color: var(--text-color-secondary);
        `;
        infoDisplay.innerHTML = 'No image loaded';

        // Create image preview
        let imagePreview = document.createElement('div');
        imagePreview.id = 'randomcycler_image_preview';
        imagePreview.style.cssText = `
            max-height: 200px;
            overflow: hidden;
            border-radius: 5px;
            text-align: center;
            background: var(--background-color-secondary);
            display: none;
        `;

        let previewImg = document.createElement('img');
        previewImg.id = 'randomcycler_preview_img';
        previewImg.style.cssText = `
            max-width: 100%;
            max-height: 200px;
            object-fit: contain;
        `;
        imagePreview.appendChild(previewImg);

        // Create path display
        let pathDisplay = document.createElement('div');
        pathDisplay.id = 'randomcycler_path';
        pathDisplay.style.cssText = `
            margin-top: 10px;
            padding: 5px;
            background: var(--background-color-secondary);
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.85em;
            word-break: break-all;
            display: none;
        `;

        // Assemble container
        previewContainer.appendChild(buttonRow);
        previewContainer.appendChild(infoDisplay);
        previewContainer.appendChild(imagePreview);
        previewContainer.appendChild(pathDisplay);

        // Insert after the cycle mode or folder path
        let insertAfter = document.getElementById('input_randomcycler_mode')?.closest('.sui-popover-model') 
                        || folderInput.closest('.sui-popover-model');
        if (insertAfter && insertAfter.parentNode) {
            insertAfter.parentNode.insertBefore(previewContainer, insertAfter.nextSibling);
        }
    }

    async loadRandomImage() {
        // Get current folder path
        let folderInput = document.getElementById('input_randomcycler_folder_path');
        if (!folderInput || !folderInput.value) {
            this.showMessage('Please specify a folder path first', 'error');
            return;
        }

        let folder = folderInput.value;
        
        // Get cycle mode
        let modeSelect = document.getElementById('input_randomcycler_mode');
        let mode = modeSelect ? modeSelect.value : 'Sequential';

        try {
            // Call the API to get next image
            let response = await this.callAPI('GetNextImage', {
                folder: folder,
                mode: mode
            });

            if (response.error) {
                this.showMessage(`Error: ${response.error}`, 'error');
                return;
            }

            if (response.success && response.path) {
                // Update displays
                this.currentImagePath = response.path;
                this.showMessage(`Loaded: ${response.image} (${response.index + 1}/${response.total})`, 'success');
                
                // Show path
                let pathDisplay = document.getElementById('randomcycler_path');
                if (pathDisplay) {
                    pathDisplay.textContent = response.path;
                    pathDisplay.style.display = 'block';
                }

                // Load and show preview
                await this.loadImagePreview(response.path);
                
                // Also set it as init image in the main UI
                await this.setAsInitImage(response.path);
            }
        } catch (error) {
            this.showMessage(`Failed to load random image: ${error}`, 'error');
        }
    }

    async loadImagePreview(imagePath) {
        try {
            // Use the GetImageData API to get the image as base64
            let response = await this.callAPI('GetImageData', {
                path: imagePath
            });
            
            if (response.success && response.data) {
                let previewImg = document.getElementById('randomcycler_preview_img');
                let imagePreview = document.getElementById('randomcycler_image_preview');
                
                if (previewImg && imagePreview) {
                    previewImg.src = response.data;
                    previewImg.title = response.filename || 'Preview Image';
                    imagePreview.style.display = 'block';
                }
            } else {
                // Fallback to URL method if API fails
                let imageUrl = `/Output/${imagePath.replace(/\\/g, '/').split('/Output/').pop()}`;
                
                let previewImg = document.getElementById('randomcycler_preview_img');
                let imagePreview = document.getElementById('randomcycler_image_preview');
                
                if (previewImg && imagePreview) {
                    previewImg.src = imageUrl;
                    imagePreview.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to load preview:', error);
        }
    }

    async setAsInitImage(imagePath) {
        try {
            // Use the GetImageData API to get the image as base64
            let response = await this.callAPI('GetImageData', {
                path: imagePath
            });
            
            if (response.success && response.data) {
                // Find the init image input in the main UI
                let initImageContainer = document.querySelector('[data-param-id="initimage"]');
                if (initImageContainer) {
                    // Click to open the init image section if needed
                    let toggleButton = initImageContainer.querySelector('.auto-accordion-toggler');
                    if (toggleButton && !initImageContainer.classList.contains('active')) {
                        toggleButton.click();
                    }

                    // Find the actual input element
                    let imageInput = document.getElementById('input_initimage');
                    if (imageInput) {
                        // Set value and trigger change
                        imageInput.value = response.data;
                        imageInput.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Update preview if exists
                        let previewImg = initImageContainer.querySelector('.image-preview img');
                        if (previewImg) {
                            previewImg.src = response.data;
                        }
                    }
                }
            } else {
                // Fallback to URL method if API fails
                let imageUrl = `/Output/${imagePath.replace(/\\/g, '/').split('/Output/').pop()}`;
                
                // Find the init image input in the main UI
                let initImageContainer = document.querySelector('[data-param-id="initimage"]');
                if (initImageContainer) {
                    // Click to open the init image section if needed
                    let toggleButton = initImageContainer.querySelector('.auto-accordion-toggler');
                    if (toggleButton && !initImageContainer.classList.contains('active')) {
                        toggleButton.click();
                    }

                    // Set the image
                    fetch(imageUrl)
                        .then(response => response.blob())
                        .then(blob => {
                            let reader = new FileReader();
                            reader.onloadend = () => {
                                // Find the actual input element
                                let imageInput = document.getElementById('input_initimage');
                                if (imageInput) {
                                    // Set value and trigger change
                                    imageInput.value = reader.result;
                                    imageInput.dispatchEvent(new Event('change', { bubbles: true }));
                                    
                                    // Update preview if exists
                                    let previewImg = initImageContainer.querySelector('.image-preview img');
                                    if (previewImg) {
                                        previewImg.src = reader.result;
                                    }
                                }
                            };
                            reader.readAsDataURL(blob);
                        });
                }
            }
        } catch (error) {
            console.error('Failed to set init image:', error);
        }
    }

    async resetCycler() {
        let folderInput = document.getElementById('input_randomcycler_folder_path');
        let folder = folderInput ? folderInput.value : '';

        try {
            let response = await this.callAPI('ResetCycler', {
                folder: folder
            });

            if (response.success) {
                this.showMessage('Counter reset successfully', 'success');
                // Clear preview
                let imagePreview = document.getElementById('randomcycler_image_preview');
                let pathDisplay = document.getElementById('randomcycler_path');
                if (imagePreview) imagePreview.style.display = 'none';
                if (pathDisplay) pathDisplay.style.display = 'none';
            }
        } catch (error) {
            this.showMessage(`Failed to reset: ${error}`, 'error');
        }
    }

    showMessage(message, type) {
        let infoDisplay = document.getElementById('randomcycler_info');
        if (infoDisplay) {
            infoDisplay.textContent = message;
            infoDisplay.style.color = type === 'error' ? '#ff6b6b' : 
                                     type === 'success' ? '#51cf66' : 
                                     'var(--text-color-secondary)';
        }
    }

    async callAPI(method, data) {
        // Use SwarmUI's WebSocket API if available
        if (typeof makeWSRequestT2I !== 'undefined') {
            return await makeWSRequestT2I(method, data);
        }
        
        // Fallback to HTTP API
        let response = await fetch(`/API/${method}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        return await response.json();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new RandomImageCyclerUI();
});

// Also try to initialize immediately in case DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    new RandomImageCyclerUI();
}

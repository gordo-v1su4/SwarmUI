// SwarmUI Random Image Extension - JavaScript
// Adds a "Random Image" button to the Init Image section

let randomImageExtension = {
    initialized: false,
    buttonAdded: false,

    // Initialize the extension
    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('Random Image Extension: Initializing...');
        
        // Try to add button immediately
        this.addRandomImageButton();
        
        // Also try again after page loads and DOM changes
        setTimeout(() => this.addRandomImageButton(), 1000);
        setTimeout(() => this.addRandomImageButton(), 3000);
        setTimeout(() => this.addRandomImageButton(), 5000);
        
        // Listen for parameter group toggles (when init image section is opened)
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-bs-toggle="collapse"]') || 
                e.target.closest('[data-bs-toggle="collapse"]')) {
                setTimeout(() => this.addRandomImageButton(), 500);
            }
        });
    },

    // Add the Random Image button to the interface
    addRandomImageButton: function() {
        if (this.buttonAdded) return;
        
        // Look for the init image input field
        const initImageInput = document.querySelector('input[data-param-id="initimage"]') ||
                              document.querySelector('#param_initimage') ||
                              document.querySelector('input[placeholder*="init"]') ||
                              document.querySelector('input[name*="initimage"]');
        
        if (!initImageInput) {
            console.log('Random Image Extension: Init image input not found, retrying...');
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('random-image-btn')) {
            this.buttonAdded = true;
            return;
        }
        
        // Find the parent container
        let container = initImageInput.parentNode;
        while (container && !container.classList.contains('param-box') && 
               !container.classList.contains('input-group') &&
               container.tagName !== 'DIV') {
            container = container.parentNode;
        }
        
        if (!container) {
            console.log('Random Image Extension: Could not find suitable container');
            return;
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex mt-2';
        
        // Create the Random Image button
        const randomButton = document.createElement('button');
        randomButton.id = 'random-image-btn';
        randomButton.type = 'button';
        randomButton.className = 'btn btn-sm btn-outline-secondary';
        randomButton.innerHTML = '🎲 Random Image';
        randomButton.title = 'Select a random image from random_init_images folder';
        randomButton.onclick = () => this.selectRandomImage();
        
        // Create a settings button for folder path
        const settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.className = 'btn btn-sm btn-outline-secondary ms-1';
        settingsButton.innerHTML = '⚙️';
        settingsButton.title = 'Random image settings';
        settingsButton.onclick = () => this.showSettings();
        
        buttonContainer.appendChild(randomButton);
        buttonContainer.appendChild(settingsButton);
        
        // Add to the container
        container.appendChild(buttonContainer);
        
        this.buttonAdded = true;
        console.log('Random Image Extension: Button added successfully');
    },

    // Select a random image via API
    selectRandomImage: async function() {
        const button = document.getElementById('random-image-btn');
        if (!button) return;
        
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Selecting...';
        button.disabled = true;
        
        try {
            const folder = localStorage.getItem('randomImageFolder') || 'random_init_images';
            const response = await fetch('/API/SelectRandomImageAPI', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folder: folder,
                    seed: -1 // Always random
                })
            });
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Set the selected image as init image
                const initImageInput = document.querySelector('input[data-param-id="initimage"]') ||
                                      document.querySelector('#param_initimage');
                
                if (initImageInput) {
                    initImageInput.value = result.imagePath;
                    
                    // Trigger change event to update SwarmUI
                    initImageInput.dispatchEvent(new Event('input', { bubbles: true }));
                    initImageInput.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Show success notification
                    this.showNotification(`✅ Random image selected: ${result.filename}`, 'success');
                } else {
                    throw new Error('Could not find init image input field');
                }
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Random Image Extension error:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    },

    // Show settings modal
    showSettings: function() {
        const currentFolder = localStorage.getItem('randomImageFolder') || 'random_init_images';
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Random Image Settings</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Image Folder Path:</label>
                            <input type="text" class="form-control" id="random-image-folder" 
                                   value="${currentFolder}" placeholder="random_init_images">
                            <div class="form-text">
                                Relative path to folder containing your random images.
                                Examples: "random_init_images", "images/references", etc.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="randomImageExtension.saveSettings()">Save</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    },

    // Save settings
    saveSettings: function() {
        const folderInput = document.getElementById('random-image-folder');
        if (folderInput) {
            localStorage.setItem('randomImageFolder', folderInput.value.trim());
            this.showNotification('✅ Settings saved', 'success');
            
            // Close modal
            const modal = folderInput.closest('.modal');
            if (modal) {
                bootstrap.Modal.getInstance(modal).hide();
            }
        }
    },

    // Show notification
    showNotification: function(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.random-image-notification').forEach(n => n.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show random-image-notification`;
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => randomImageExtension.init());
} else {
    randomImageExtension.init();
}

// Also initialize on window load (backup)
window.addEventListener('load', () => randomImageExtension.init());

console.log('Random Image Extension: Script loaded');

// SwarmUI Random Image Extension - JavaScript v2.1
// Adds a "Random Image" button to the Init Image section
// Updated: 2025-08-17 - Clean image selection, no testing

// Helper function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let randomImageExtension = {
    initialized: false,
    buttonAdded: false,
    autoCycleEnabled: false,
    imageCache: [],
    lastGenerationCount: 0,

    // Initialize the extension
    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        
        console.log('Random Image Extension: Initializing...');
        
        // Force cleanup of old localStorage settings
        const currentFolder = localStorage.getItem('randomImageFolder');
        if (currentFolder && currentFolder !== 'random_init_images') {
            console.log('🔧 Cleaning up old localStorage folder setting:', currentFolder, '-> random_init_images');
            localStorage.setItem('randomImageFolder', 'random_init_images');
        }
        
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
        
        // Look for the init image input field with more specific selectors
        let initImageInput = document.querySelector('input[data-param-id="initimage"]') ||
                            document.querySelector('#param_initimage') ||
                            document.querySelector('input[placeholder*="init"]') ||
                            document.querySelector('input[name*="initimage"]');
        
        // If we can't find it by specific selectors, try to find it near "Init Image" text
        if (!initImageInput) {
            const initImageLabels = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.trim() === 'Init Image'
            );
            
            for (let label of initImageLabels) {
                // Look for input elements near this label
                let parent = label.parentNode;
                while (parent && parent !== document.body) {
                    const nearbyInput = parent.querySelector('input[type="text"]');
                    if (nearbyInput) {
                        initImageInput = nearbyInput;
                        break;
                    }
                    parent = parent.parentNode;
                }
                if (initImageInput) break;
            }
        }
        
        // Last resort - try any text input in the general init image area
        if (!initImageInput) {
            const allSections = document.querySelectorAll('.param-group, .card, .collapse');
            for (let section of allSections) {
                if (section.textContent && section.textContent.includes('Init Image')) {
                    const input = section.querySelector('input[type="text"]');
                    if (input) {
                        initImageInput = input;
                        break;
                    }
                }
            }
        }
        
        console.log('Random Image Extension: Looking for Init Image input...');
        if (!initImageInput) {
            console.log('Random Image Extension: Init image input not found, will try fallback placement...');
            // Fallback: try to add button to a general location if we can't find the specific input
            return this.addButtonFallback();
        }
        
        console.log('Random Image Extension: Found init image input:', initImageInput);
        
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
        
        // Create auto-cycle toggle button
        const autoCycleButton = document.createElement('button');
        autoCycleButton.id = 'auto-cycle-btn';
        autoCycleButton.type = 'button';
        autoCycleButton.className = 'btn btn-sm btn-outline-info ms-1';
        autoCycleButton.innerHTML = '🔄 Auto-Cycle';
        autoCycleButton.title = 'Automatically cycle through random images during Generate Forever mode';
        autoCycleButton.onclick = () => this.toggleAutoCycle();
        
        buttonContainer.appendChild(autoCycleButton);
        
        // Add to the container
        container.appendChild(buttonContainer);
        
        // Start monitoring for generate forever mode
        this.startGenerationMonitoring();
        
        this.buttonAdded = true;
        console.log('Random Image Extension: Button added successfully');
    },

    // Fallback method to add button when we can't find the init image input
    addButtonFallback: function() {
        // Try to add to the Generate tab itself as a fallback
        const generateTab = document.querySelector('#generate-tab, .generate-tab, [data-tab="generate"]');
        if (!generateTab) {
            console.log('Random Image Extension: Could not find generate tab for fallback placement');
            return;
        }
        
        // Look for any suitable container in the generate tab
        const containers = generateTab.querySelectorAll('.card-body, .tab-content, .container-fluid');
        let targetContainer = containers[0]; // Use first available container
        
        if (!targetContainer) {
            console.log('Random Image Extension: Could not find suitable fallback container');
            return;
        }
        
        // Check if button already exists
        if (document.getElementById('random-image-btn')) {
            this.buttonAdded = true;
            return;
        }
        
        // Create a prominent container for the fallback placement
        const fallbackContainer = document.createElement('div');
        fallbackContainer.className = 'alert alert-info d-flex align-items-center mt-3';
        fallbackContainer.innerHTML = '<i class="fas fa-info-circle me-2"></i><strong>Random Image Extension:</strong><span class="ms-2">Init Image field not found, using fallback placement.</span>';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'd-flex ms-auto';
        
        // Create the Random Image button
        const randomButton = document.createElement('button');
        randomButton.id = 'random-image-btn';
        randomButton.type = 'button';
        randomButton.className = 'btn btn-sm btn-primary';
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
        fallbackContainer.appendChild(buttonContainer);
        
        // Add to the top of the target container
        targetContainer.insertBefore(fallbackContainer, targetContainer.firstChild);
        
        this.buttonAdded = true;
        console.log('Random Image Extension: Button added via fallback method');
    },

    // Select a random image from the configured folder
    selectRandomImage: async function() {
        const button = document.getElementById('random-image-btn');
        if (!button) return;
        
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Discovering images...';
        button.disabled = true;
        
        try {
            // Get the configured folder from settings (default to the working path)
            let configuredFolder = localStorage.getItem('randomImageFolder') || 'random_init_images';
            
            // Check if we have an old 'Output/local/random_init_images' setting and fix it
            if (configuredFolder === 'Output/local/random_init_images') {
                configuredFolder = 'random_init_images';
                localStorage.setItem('randomImageFolder', 'random_init_images');
                console.log('🔧 Fixed localStorage folder setting to correct path: random_init_images');
            }
            
            // Clear any old cached folder setting that might be wrong
            const currentCachedFolder = localStorage.getItem('randomImageFolder');
            if (currentCachedFolder === 'View/local/random_init_images') {
                localStorage.setItem('randomImageFolder', 'random_init_images');
                console.log('🔧 Fixed old folder setting from:', currentCachedFolder, 'to: random_init_images');
            }
            
            console.log('🎲 Random Image Extension: Looking for images in folder:', configuredFolder);
            
            // Get images using SwarmUI's API - no fallbacks
            let imageFiles = await this.getImagesFromAPI(configuredFolder);
            
            if (imageFiles.length === 0) {
                throw new Error(`No images found in folder: ${configuredFolder}. Check folder path and permissions.`);
            }
            
            console.log(`🎲 Found ${imageFiles.length} images in ${configuredFolder}`);
            
            // Select random image from the discovered list
            const randomIndex = Math.floor(Math.random() * imageFiles.length);
            const selectedImagePath = imageFiles[randomIndex];
            const filename = selectedImagePath.split('/').pop();
            
            console.log(`🎯 Selected image ${randomIndex + 1}/${imageFiles.length}:`, selectedImagePath);
            
            // Find the init image input field
            const initImageInput = document.querySelector('input[data-param-id="initimage"]') ||
                                  document.querySelector('#param_initimage') ||
                                  document.querySelector('#input_initimage_pastebox');
            
            console.log('🔍 Found init image input:', initImageInput);
            console.log('🔍 Current input value before:', initImageInput ? initImageInput.value : 'INPUT NOT FOUND');
            
            if (!initImageInput) {
                throw new Error('Could not find init image input field');
            }
            
            // Set the selected image path
            initImageInput.value = selectedImagePath;
            console.log('🔍 Set input value to:', selectedImagePath);
            console.log('🔍 Input value after setting:', initImageInput.value);
            
            // Also update the file chooser display if it exists
            const fileChooser = document.querySelector('input[type="file"]');
            if (fileChooser && fileChooser.parentElement) {
                const fileDisplay = fileChooser.parentElement.querySelector('.file-name, .chosen-file, [class*="file"]');
                if (fileDisplay) {
                    fileDisplay.textContent = filename;
                }
            }
            
            // CRITICAL: Update SwarmUI's internal parameter tracking
            // This is essential for the image preview to work
            if (window.rawGenInputs && window.rawGenInputs.initimage) {
                window.rawGenInputs.initimage = selectedImagePath;
                console.log('✅ Updated rawGenInputs.initimage:', selectedImagePath);
            }
            
            // Also update genInputs if it exists
            if (window.genInputs && window.genInputs.initimage) {
                window.genInputs.initimage.value = selectedImagePath;
                console.log('✅ Updated genInputs.initimage:', selectedImagePath);
            }
            
            // Trigger comprehensive events to notify SwarmUI of the change
            const events = ['input', 'change', 'blur', 'focus'];
            events.forEach(eventType => {
                initImageInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
            });
            
            // Force SwarmUI to refresh the image preview by simulating user interaction
            initImageInput.focus();
            
            // Critical: Call SwarmUI's parameter update functions to trigger preview
            setTimeout(() => {
                initImageInput.blur();
                
                // CRITICAL: Find the SwarmUI file input and properly trigger the image loading
                try {
                    // 1. Find the parent container that holds both text input and file input
                    console.log('🔍 Finding file input container...');
                    const parentContainer = initImageInput.closest('.auto-input');
                    if (!parentContainer) {
                        throw new Error('Could not find parent container for init image input');
                    }
                    
                    // 2. Find the file input within the container
                    const fileInput = parentContainer.querySelector('input[type="file"]');
                    if (!fileInput) {
                        throw new Error('Could not find file input element');
                    }
                    console.log('✅ Found file input:', fileInput);
                    
                    // 3. Tell SwarmUI to load the image from the API path
                    console.log('🔄 Loading image from path:', selectedImagePath);
                    
                    // Update any internal tracking variables
                    if (window.rawGenInputs && window.rawGenInputs.initimage) {
                        window.rawGenInputs.initimage = selectedImagePath;
                        console.log('✅ Updated rawGenInputs.initimage');
                    }
                    
                    if (window.genInputs && window.genInputs.initimage) {
                        window.genInputs.initimage.value = selectedImagePath;
                        console.log('✅ Updated genInputs.initimage');
                    }
                    
                    // 4. Load the image via HTTP GET and simulate file input
                    console.log('🔄 Loading image via HTTP GET:', selectedImagePath);
                    
                    // Use the image path directly as SwarmUI serves images via HTTP
                    const imageUrl = `/${selectedImagePath}`;
                    
                    fetch(imageUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Failed to fetch image: ${response.status}`);
                            }
                            return response.blob();
                        })
                        .then(blob => {
                            console.log('✅ Got image blob from server');
                            
                            // Create a File object from the blob
                            const filename = selectedImagePath.split('/').pop();
                            const file = new File([blob], filename, { type: blob.type });
                            
                            // Create a DataTransfer to simulate file selection
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            
                            // Set the files on the file input
                            fileInput.files = dataTransfer.files;
                            
                            // Trigger SwarmUI's load_image_file function manually
                            if (typeof load_image_file === 'function') {
                                load_image_file(fileInput);
                                console.log('✅ Called load_image_file directly');
                            } else {
                                // Fallback - trigger change event and manual preview setup
                                console.log('⚠️ load_image_file not available, using fallback');
                                
                                // Update filename display
                                const label = parentContainer.querySelector('.auto-file-input-filename');
                                if (label) {
                                    label.textContent = filename;
                                }
                                
                                // Create image preview
                                const preview = parentContainer.querySelector('.auto-input-image-preview');
                                if (preview) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        preview.innerHTML = `<button class="interrupt-button auto-input-image-remove-button" title="Remove image">×</button><img alt="Image preview" />`;
                                        const img = preview.querySelector('img');
                                        img.src = e.target.result;
                                        
                                        // Store the data on the file input
                                        fileInput.dataset.filedata = e.target.result;
                                        
                                        // Trigger change events
                                        if (typeof triggerChangeFor === 'function') {
                                            triggerChangeFor(fileInput);
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                }
                                
                                // Trigger standard change events
                                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            
                            console.log('✅ Image loaded successfully into file input');
                        })
                        .catch(error => {
                            console.error('Error loading image:', error);
                            this.showNotification(`❌ Error loading image: ${error.message}`, 'error');
                        });
                    
                    // Trigger standard parameter update methods as fallback
                    if (typeof directSetParameter === 'function') {
                        directSetParameter('initimage', selectedImagePath);
                    }
                    
                    if (typeof doParameterRefresh === 'function') {
                        doParameterRefresh();
                    }
                    
                } catch (error) {
                    console.log('⚠️ Error loading image:', error.message);
                }
                
            }, 200);
            
            // Show success notification
            this.showNotification(`✅ Random image selected: ${filename}`, 'success');
            console.log('✅ Random Image Extension: Successfully set image path:', selectedImagePath);
        } catch (error) {
            console.error('Random Image Extension error:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    },


    // Get images using SwarmUI's ListImages API - using only the correct path
    getImagesFromAPI: async function(folderPath) {
        const sessionId = getCookie('session_id');
        console.log('🔍 Using session ID:', sessionId ? 'found' : 'missing');
        
        if (!sessionId) {
            throw new Error('No session ID found. Please refresh the page and try again.');
        }
        
        // We know 'random_init_images' is the correct path, so use it directly
        const correctPath = 'random_init_images';
        console.log(`📡 Using known working API path: ${correctPath}`);
        
        try {
            const response = await fetch('/API/ListImages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    path: correctPath,
                    depth: 1
                })
            });
            
            console.log(`📡 ListImages API response status:`, response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`📡 ListImages API response data:`, data);
                
                if (data.files && data.files.length > 0) {
                    console.log(`✅ SUCCESS! Found ${data.files.length} files`);
                    
                    // Debug: Log the first few files to see their structure
                    console.log('🔍 First few files structure:', data.files.slice(0, 3));
                    if (data.files.length > 0) {
                        console.log('🔍 Sample file keys:', Object.keys(data.files[0]));
                        console.log('🔍 Sample file full object:', data.files[0]);
                    }
                    
                    // Filter for image files only
                        // Handle both string and object file entries
                        const imageFiles = data.files
                            .filter(file => {
                                // Extract filename from SwarmUI API response structure
                                let fileName = '';
                                if (typeof file === 'string') {
                                    fileName = file;
                                } else if (file && typeof file === 'object' && file.src) {
                                    // SwarmUI returns files with 'src' property containing the filename
                                    fileName = file.src;
                                }
                                
                                const isImageFile = fileName.toLowerCase().match(/\.(png|jpg|jpeg|bmp|tiff|webp)$/i);
                                console.log(`🔍 File object:`, file, `-> fileName: '${fileName}' -> isImageFile: ${!!isImageFile}`);
                                return isImageFile;
                            })
                            .map(file => {
                                // Extract filename using the same logic as filter
                                let fileName = '';
                                if (typeof file === 'string') {
                                    fileName = file;
                                } else if (file && typeof file === 'object' && file.src) {
                                    fileName = file.src;
                                }
                                return `${correctPath}/${fileName}`;
                            });
                    
                    console.log(`🔍 After filtering: ${imageFiles.length} image files found`);
                    
                    if (imageFiles.length > 0) {
                        console.log(`✅ Found ${imageFiles.length} image files:`, imageFiles.slice(0, 5));
                        return imageFiles;
                    }
                    
                    throw new Error(`Found ${data.files.length} files but no valid images after filtering`);
                } else {
                    throw new Error(`No files found in ${correctPath}`);
                }
            } else {
                throw new Error(`API failed with status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Error with API call:`, error.message);
            throw error;
        }
    },


    // Show settings modal
    showSettings: function() {
        const today = new Date().toISOString().slice(0, 10);
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
                                <strong>Available folders:</strong><br>
                                <code>random_init_images</code> - Your custom init images (default - WORKING)<br>
                                <code>View/local/raw/2025-08-10</code> - Aug 10 output<br>
                                <code>View/local/raw/${today}</code> - Today's output<br>
                                <code>View/local/Starred</code> - Starred images<br>
                                <small class="text-muted">Note: Use 'random_init_images' for your custom folder that maps to Output/local/random_init_images</small>
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

    // Toggle auto-cycle functionality
    toggleAutoCycle: function() {
        const button = document.getElementById('auto-cycle-btn');
        if (!button) return;
        
        this.autoCycleEnabled = !this.autoCycleEnabled;
        
        if (this.autoCycleEnabled) {
            button.className = 'btn btn-sm btn-info ms-1';
            button.innerHTML = '🔄 Auto-Cycle ON';
            this.showNotification('🔄 Auto-cycle enabled! Will select new images during Generate Forever mode.', 'success');
            console.log('🔄 Random Image Extension: Auto-cycle enabled');
        } else {
            button.className = 'btn btn-sm btn-outline-info ms-1';
            button.innerHTML = '🔄 Auto-Cycle';
            this.showNotification('⏸️ Auto-cycle disabled', 'info');
            console.log('⏸️ Random Image Extension: Auto-cycle disabled');
        }
    },
    
    // Start monitoring for generation events
    startGenerationMonitoring: function() {
        // Hook into the doGenerate function to intercept Generate Forever calls
        if (window.mainGenHandler && window.mainGenHandler.doGenerate) {
            const originalDoGenerate = window.mainGenHandler.doGenerate;
            window.mainGenHandler.doGenerate = function(input_overrides) {
                // Check if auto-cycle is enabled and Generate Forever is active
                if (randomImageExtension.autoCycleEnabled) {
                    const generateForeverButton = document.getElementById('generate_forever_button');
                    if (generateForeverButton && generateForeverButton.textContent.includes('Stop')) {
                        // Generate Forever is active, select a new random image before generation
                        console.log('🔄 Auto-cycling image for Generate Forever...');
                        randomImageExtension.selectRandomImageSilent();
                    }
                }
                // Call the original doGenerate function
                return originalDoGenerate.call(this, input_overrides);
            };
            console.log('✅ Random Image Extension: Hooked into doGenerate for auto-cycle');
        }
        
        // Also keep the batch monitor for fallback and visual feedback
        const observer = new MutationObserver((mutations) => {
            if (!this.autoCycleEnabled) return;
            
            mutations.forEach((mutation) => {
                // Check if new images were added to the batch
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && 
                            (node.classList.contains('image-batch-image') || 
                             node.querySelector && node.querySelector('.image-batch-image'))) {
                            // Visual feedback that auto-cycle is working
                            const button = document.getElementById('auto-cycle-btn');
                            if (button && this.autoCycleEnabled) {
                                // Brief flash to show activity
                                const originalClass = button.className;
                                button.className = 'btn btn-sm btn-success ms-1';
                                setTimeout(() => {
                                    button.className = originalClass;
                                }, 500);
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the batch container
        const batchContainer = document.getElementById('current_image_batch');
        if (batchContainer) {
            observer.observe(batchContainer, {
                childList: true,
                subtree: true
            });
        }
        
        console.log('🔍 Random Image Extension: Generation monitoring started');
    },
    
    // Select a random image silently (without UI feedback)
    selectRandomImageSilent: async function() {
        try {
            const configuredFolder = localStorage.getItem('randomImageFolder') || 'random_init_images';
            
            // Clear any old cached folder setting that might be wrong
            const currentCachedFolder = localStorage.getItem('randomImageFolder');
            if (currentCachedFolder === 'View/local/random_init_images') {
                localStorage.setItem('randomImageFolder', 'random_init_images');
                console.log('🔧 Fixed old folder setting from:', currentCachedFolder, 'to: random_init_images');
                // Clear cache since folder changed
                this.imageCache = [];
            }
            
            // Always refresh cache to ensure we're using images from the correct folder
            // Use cached images if available, otherwise get new ones via API
            if (this.imageCache.length === 0) {
                let imageFiles = await this.getImagesFromAPI(configuredFolder);
                this.imageCache = imageFiles;
            }
            
            if (this.imageCache.length === 0) {
                return;
            }
            
            // Select random image
            const randomIndex = Math.floor(Math.random() * this.imageCache.length);
            const selectedImagePath = this.imageCache[randomIndex];
            const filename = selectedImagePath.split('/').pop();
            
            // Find and update the init image input
            const initImageInput = document.querySelector('input[data-param-id="initimage"]') ||
                                  document.querySelector('#param_initimage') ||
                                  document.querySelector('#input_initimage_pastebox');
            
            if (initImageInput) {
                initImageInput.value = selectedImagePath;
                
                // Trigger events to notify SwarmUI
                const events = ['input', 'change'];
                events.forEach(eventType => {
                    initImageInput.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                });
                
                console.log(`🔄 Auto-cycled to: ${filename}`);
            }
        } catch (error) {
            console.log('🔄 Auto-cycle error:', error.message);
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

console.log('Random Image Extension: Script loaded - v2.2-20250817-144023');
console.log('🆕 New version with proper file input handling loaded!');
console.log('🔍 Extension uses ListImages API, not SelectRandomImage API');

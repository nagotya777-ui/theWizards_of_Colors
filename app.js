// Application State
const state = {
    colors: [],
    colorDetails: {},
    characters: {},
    selectedColor: null,
    selectedCharacter: null,
    // Cache DOM elements
    dom: {}
};

// Cache frequently used DOM elements
function cacheDOMElements() {
    state.dom = {
        colorSelectionScreen: document.getElementById('colorSelectionScreen'),
        characterListScreen: document.getElementById('characterListScreen'),
        characterProfileScreen: document.getElementById('characterProfileScreen'),
        gradientBar: document.getElementById('gradientBar'),
        colorPointers: document.getElementById('colorPointers'),
        gradientContainer: document.querySelector('.gradient-container'),
        colorBackground: document.getElementById('colorBackground'),
        selectedColorName: document.getElementById('selectedColorName'),
        colorDescription: document.getElementById('colorDescription'),
        characterGrid: document.getElementById('characterGrid'),
        profileColorBackground: document.getElementById('profileColorBackground'),
        profileColorName: document.getElementById('profileColorName'),
        profileColorDescription: document.getElementById('profileColorDescription'),
        characterName: document.getElementById('characterName'),
        characterFullImage: document.getElementById('characterFullImage'),
        characterProfile: document.getElementById('characterProfile'),
        characterMagic: document.getElementById('characterMagic'),
        characterBio: document.getElementById('characterBio'),
        expressionVariations: document.getElementById('expressionVariations'),
        relatedCharacters: document.getElementById('relatedCharacters'),
        relatedCharactersGrid: document.getElementById('relatedCharactersGrid')
    };
}

// Initialize the application
async function init() {
    cacheDOMElements();
    await loadColorsList();
    sortColorsByHue(); // Sort colors by hue for smooth gradient
    renderGradientBar();
    setupEventListeners();
}

// Convert hex color to HSL
function hexToHSL(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

// Sort colors by hue for smooth gradient, with low saturation colors on the right
function sortColorsByHue() {
    state.colors.sort((a, b) => {
        const hslA = hexToHSL(a.colorCode);
        const hslB = hexToHSL(b.colorCode);
        
        // Sort by hue first to maintain gradient order
        if (Math.abs(hslA.h - hslB.h) >= 1) {
            return hslB.h - hslA.h; // Reverse hue order
        }
        
        // For similar hues, sort by saturation (low saturation colors go to the right/end)
        return hslB.s - hslA.s; // High saturation first (low saturation goes to the end)
    });
}

// Load colors list (lightweight - only basic info)
async function loadColorsList() {
    try {
        const response = await fetch('data/colors.json?v=' + Date.now());
        const config = await response.json();
        state.colors = config.colors;
        console.log('Loaded colors:', state.colors.length, 'colors');
    } catch (error) {
        console.error('Error loading colors list:', error);
        // Fallback to old config.json if colors.json doesn't exist
        await loadOldConfig();
    }
}

// Fallback: Load old config.json format
async function loadOldConfig() {
    try {
        const response = await fetch('data/config.json?v=' + Date.now());
        const config = await response.json();
        // Convert old format to new format
        state.colors = config.colors.map(color => ({
            id: color.name,
            name: color.name,
            colorCode: color.colorCode,
            dataPath: `data/${color.name}`,
            _fullData: color // Store full data for fallback
        }));
        console.log('Using old config.json format:', state.colors.length, 'colors');
    } catch (error) {
        console.error('Error loading config:', error);
        state.colors = [];
    }
}

// Load specific color details (lazy loading)
async function loadColorDetails(colorId) {
    if (state.colorDetails[colorId]) {
        return state.colorDetails[colorId];
    }
    
    try {
        const color = state.colors.find(c => c.id === colorId);
        if (!color) return null;
        
        // Check if we have full data from old config
        if (color._fullData) {
            state.colorDetails[colorId] = {
                name: color._fullData.name,
                colorCode: color._fullData.colorCode,
                description: color._fullData.description || '',
                symbol: color._fullData.symbol || ''
            };
            return state.colorDetails[colorId];
        }
        
        // Load from new split structure
        const response = await fetch(`${color.dataPath}/color.json?v=${Date.now()}`);
        const details = await response.json();
        
        // Add full path to symbol
        if (details.symbol) {
            details.symbol = `${color.dataPath}/${details.symbol}`;
        }
        
        state.colorDetails[colorId] = details;
        return details;
    } catch (error) {
        console.error(`Error loading color details for ${colorId}:`, error);
        // Return basic info as fallback
        const color = state.colors.find(c => c.id === colorId);
        return {
            name: color.name,
            colorCode: color.colorCode,
            description: '',
            symbol: ''
        };
    }
}

// Load characters for a specific color (lazy loading)
async function loadCharactersForColor(colorId) {
    try {
        const color = state.colors.find(c => c.id === colorId);
        if (!color) return [];
        
        // Check if we have full data from old config
        if (color._fullData && color._fullData.characters) {
            return color._fullData.characters.map(char => ({
                id: char.id,
                name: char.name,
                _fullProfile: char // Store for later use
            }));
        }
        
        // Load from new split structure
        const response = await fetch(`${color.dataPath}/characters/characters.json?v=${Date.now()}`);
        const data = await response.json();
        return data.characters;
    } catch (error) {
        console.error(`Error loading characters for ${colorId}:`, error);
        return [];
    }
}

// Load specific character profile (lazy loading)
async function loadCharacterProfile(colorId, characterId) {
    const cacheKey = `${colorId}_${characterId}`;
    if (state.characters[cacheKey]) {
        return state.characters[cacheKey];
    }
    
    try {
        const color = state.colors.find(c => c.id === colorId);
        if (!color) return null;
        
        // Check if we have full data from old config
        const charactersData = await loadCharactersForColor(colorId);
        const charInfo = charactersData.find(c => c.id === characterId);
        if (!charInfo) return null;
        
        // If we have full profile from old config
        if (charInfo._fullProfile) {
            state.characters[cacheKey] = charInfo._fullProfile;
            return charInfo._fullProfile;
        }
        
        // Load from new split structure
        const response = await fetch(`${color.dataPath}/characters/${charInfo.profilePath}?v=${Date.now()}`);
        const profile = await response.json();
        
        // Add full paths to images
        profile.icon = `${color.dataPath}/characters/${characterId}/${profile.icon}`;
        profile.fullImage = `${color.dataPath}/characters/${characterId}/${profile.fullImage}`;
        if (profile.expressions) {
            profile.expressions = profile.expressions.map(exp => 
                `${color.dataPath}/characters/${characterId}/${exp}`
            );
        }
        
        state.characters[cacheKey] = profile;
        return profile;
    } catch (error) {
        console.error(`Error loading character profile for ${characterId}:`, error);
        return null;
    }
}

// Render the gradient bar with color pointers
function renderGradientBar() {
    const { gradientBar, colorPointers, gradientContainer, colorSelectionScreen } = state.dom;
    
    // Create gradient from all colors with proper spacing
    const totalColors = state.colors.length;
    const gradientStops = state.colors.map((c, i) =>
        `${c.colorCode} ${(i / (totalColors - 1)) * 100}%`
    ).join(', ');
    gradientBar.style.background = `linear-gradient(to right, ${gradientStops})`;
    
    // Adjust minimum width based on number of colors (1.2x multiplier)
    const minWidth = `${Math.max(800, totalColors * 170) * 1.4}px`;
    gradientBar.style.minWidth = minWidth;
    colorPointers.style.minWidth = minWidth;
    
    // Create pointers for each color using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    state.colors.forEach(color => {
        const pointer = document.createElement('div');
        pointer.className = 'color-pointer';
        pointer.innerHTML = `
            <div class="pointer-line"></div>
            <div class="pointer-label" style="color: #2c2c2c">
                <div class="color-symbol default-circle" style="background: ${color.colorCode}"></div>
                <span>${color.name}</span>
            </div>
        `;
        pointer.addEventListener('click', () => selectColor(color));
        fragment.appendChild(pointer);
    });
    
    colorPointers.innerHTML = '';
    colorPointers.appendChild(fragment);
    
    // Add hover effect to show color on background
    setupGradientHoverEffect(gradientBar, colorSelectionScreen);
    
    // Set random initial scroll position after rendering
    setTimeout(() => {
        gradientContainer.scrollLeft = Math.random() * (gradientContainer.scrollWidth - gradientContainer.clientWidth);
    }, 100);
}

// Setup hover effect to show color on background
function setupGradientHoverEffect(gradientBar, colorSelectionScreen) {
    gradientBar.addEventListener('mousemove', (e) => {
        const rect = gradientBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        
        // Calculate which color to show based on position
        const totalColors = state.colors.length;
        const colorIndex = Math.floor((percentage / 100) * (totalColors - 1));
        const nextColorIndex = Math.min(colorIndex + 1, totalColors - 1);
        
        // Interpolate between colors
        const localPercentage = ((percentage / 100) * (totalColors - 1)) - colorIndex;
        const color1 = state.colors[colorIndex].colorCode;
        const color2 = state.colors[nextColorIndex].colorCode;
        
        const interpolatedColor = interpolateColor(color1, color2, localPercentage);
        
        // Apply very subtle background color (10% opacity)
        colorSelectionScreen.style.backgroundColor = `${interpolatedColor}1A`; // 1A = 10% opacity in hex
    });
    
    gradientBar.addEventListener('mouseleave', () => {
        colorSelectionScreen.style.backgroundColor = '#f5f5f5';
    });
}

// Interpolate between two hex colors
function interpolateColor(color1, color2, factor) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    return rgbToHex(r, g, b);
}

// Convert hex to RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
    };
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Get contrasting text color based on background color
function getContrastTextColor(hexColor) {
    const hsl = hexToHSL(hexColor);
    
    // Check if the color is in the yellow range (30° to 90°)
    const isYellowish = (hsl.h >= 30 && hsl.h <= 90);
    
    // Use lower threshold for yellow colors (they appear lighter)
    const threshold = isYellowish ? 50 : 70;
    
    // If lightness is greater than threshold, use dark text; otherwise use light text
    return hsl.l > threshold ? '#2c2c2c' : '#ffffff';
}

// Convert HSL to Hex
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Adjust button color based on background lightness
function getAdjustedButtonColor(backgroundColorCode) {
    const hsl = hexToHSL(backgroundColorCode);
    
    // If background is light (lightness > 60), darken the button color
    if (hsl.l > 60) {
        // Calculate appropriate button darkness based on background lightness
        let buttonLightness = 35;
        
        // If background is very light (lightness > 85), darken button even more
        if (hsl.l > 85) {
            buttonLightness = 15; // Very dark for very light backgrounds
        } else if (hsl.l > 80) {
            buttonLightness = 20; // Darker for light backgrounds
        } else if (hsl.l > 60) {
            buttonLightness = 30; // Moderately dark for moderately light backgrounds
        }
        
        return hslToHex(hsl.h, hsl.s, buttonLightness);
    }
    
    // If background is dark, check if original button color is also light
    if (hsl.l > 80) {
        // Even on dark backgrounds, if the color itself is light, darken it
        return hslToHex(hsl.h, hsl.s, 40);
    }
    
    // Otherwise return original color
    return backgroundColorCode;
}

// Select a color and show character list
async function selectColor(color) {
    state.selectedColor = color;
    
    // Show loading indicator
    showLoading();
    
    // Load color details and characters
    const [details, characters] = await Promise.all([
        loadColorDetails(color.id),
        loadCharactersForColor(color.id)
    ]);
    
    hideLoading();
    
    // Hide all screens first
    const { colorSelectionScreen, characterListScreen, characterProfileScreen,
            colorBackground, selectedColorName, colorDescription } = state.dom;
    
    colorSelectionScreen.classList.remove('active');
    characterListScreen.classList.remove('active');
    characterProfileScreen.classList.remove('active');
    
    // Show character list screen
    characterListScreen.classList.add('active');
    
    // Set background color
    colorBackground.style.backgroundColor = color.colorCode;
    selectedColorName.textContent = color.name;
    selectedColorName.style.color = getContrastTextColor(color.colorCode);
    colorDescription.textContent = details?.description || '';
    colorDescription.style.color = getContrastTextColor(color.colorCode);
    
    // Update back button color
    updateButtonColor(color.colorCode);
    
    // Render character grid
    renderCharacterGrid(characters, color);
    
    // Auto-scroll to character list
    setTimeout(() => {
        const characterListContainer = document.querySelector('.character-list-container');
        if (characterListContainer) {
            characterListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Render character grid
function renderCharacterGrid(characters, color) {
    const { characterGrid } = state.dom;
    const fragment = document.createDocumentFragment();
    
    characters.forEach(character => {
        const card = document.createElement('div');
        card.className = 'character-card';
        
        // Get icon path
        const iconPath = character._fullProfile?.icon ||
                        `${color.dataPath}/characters/${character.id}/icon.png`;
        
        // Get catchphrase (optional)
        const catchphraseHTML = character.catchphrase ?
            `<div class="character-catchphrase">${character.catchphrase}</div>` : '';
        
        card.innerHTML = `
            <img src="${iconPath}" alt="${character.name}" class="character-icon"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect width=%22120%22 height=%22120%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22 fill=%22%23999%22%3E${character.name}%3C/text%3E%3C/svg%3E'">
            <div class="character-info">
                <h3>${character.name}</h3>
                ${catchphraseHTML}
            </div>
        `;
        
        card.addEventListener('click', () => selectCharacter(character, color));
        fragment.appendChild(card);
    });
    
    characterGrid.innerHTML = '';
    characterGrid.appendChild(fragment);
}

// Select a character and show profile
async function selectCharacter(characterInfo, color) {
    showLoading();
    
    const profile = await loadCharacterProfile(color.id, characterInfo.id);
    
    hideLoading();
    
    if (!profile) {
        alert('キャラクター情報の読み込みに失敗しました');
        return;
    }
    
    state.selectedCharacter = profile;
    
    // Update UI
    const { characterListScreen, characterProfileScreen, profileColorBackground,
            profileColorName, profileColorDescription } = state.dom;
    
    characterListScreen.classList.remove('active');
    characterProfileScreen.classList.add('active');
    
    // Set background color
    profileColorBackground.style.backgroundColor = color.colorCode;
    
    // Set color description on profile page
    const details = await loadColorDetails(color.id);
    profileColorName.textContent = color.name;
    profileColorName.style.color = getContrastTextColor(color.colorCode);
    profileColorDescription.textContent = details?.description || '';
    profileColorDescription.style.color = getContrastTextColor(color.colorCode);
    
    // Update back button color
    updateButtonColor(color.colorCode);
    
    // Render character profile
    renderCharacterProfile(profile);
}

// Render character profile
function renderCharacterProfile(character) {
    const { characterName, characterFullImage, characterProfile,
            characterMagic, characterBio } = state.dom;
    
    characterName.textContent = character.name;
    characterFullImage.src = character.fullImage;
    characterFullImage.onerror = function() {
        this.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect width=%22300%22 height=%22400%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2218%22 fill=%22%23999%22%3E${character.name}%3C/text%3E%3C/svg%3E`;
    };
    
    // Render expression variations
    renderExpressionVariations(character);
    
    // Render profile details using DocumentFragment
    const fragment = document.createDocumentFragment();
    Object.entries(character.profile).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'profile-item';
        item.innerHTML = `
            <span class="profile-label">${getProfileLabel(key)}:</span>
            <span class="profile-value">${value}</span>
        `;
        fragment.appendChild(item);
    });
    characterProfile.innerHTML = '';
    characterProfile.appendChild(fragment);
    
    // Render magic and bio
    characterMagic.textContent = character.magic;
    characterBio.textContent = character.bio;
    
    // Render related characters
    renderRelatedCharacters(character);
}

// Render expression variations
function renderExpressionVariations(character) {
    const { expressionVariations, characterFullImage } = state.dom;
    expressionVariations.innerHTML = '';
    
    if (character.expressions?.length > 0) {
        const fragment = document.createDocumentFragment();
        character.expressions.forEach((expressionPath, index) => {
            const img = document.createElement('img');
            img.className = 'expression-img' + (index === 0 ? ' active' : '');
            img.src = expressionPath;
            img.alt = `表情${index + 1}`;
            img.onerror = function() {
                this.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2212%22 fill=%22%23999%22%3E表情${index + 1}%3C/text%3E%3C/svg%3E`;
            };
            
            img.addEventListener('click', () => {
                showExpressionModal(expressionPath);
            });
            
            fragment.appendChild(img);
        });
        expressionVariations.appendChild(fragment);
    }
}

// Show expression modal
function showExpressionModal(imagePath) {
    const modal = document.getElementById('expressionModal');
    const modalImage = document.getElementById('expressionModalImage');
    modalImage.src = imagePath;
    modal.classList.add('active');
}

// Close expression modal
function closeExpressionModal() {
    const modal = document.getElementById('expressionModal');
    modal.classList.remove('active');
}

// Render related characters
async function renderRelatedCharacters(character) {
    const { relatedCharacters, relatedCharactersGrid } = state.dom;
    relatedCharactersGrid.innerHTML = '';
    
    if (character.relatedCharacters?.length > 0) {
        // Find all characters from all colors
        const allCharacters = [];
        
        // Load characters for each color
        for (const color of state.colors) {
            // Check if we have full data from old config
            if (color._fullData && color._fullData.characters) {
                color._fullData.characters.forEach(char => {
                    allCharacters.push({ character: char, color: color });
                });
            } else {
                // Load from new split structure
                try {
                    const response = await fetch(`${color.dataPath}/characters/characters.json?v=${Date.now()}`);
                    const data = await response.json();
                    data.characters.forEach(char => {
                        allCharacters.push({ character: char, color: color });
                    });
                } catch (error) {
                    console.error(`Error loading characters for ${color.id}:`, error);
                }
            }
        }
        
        character.relatedCharacters.forEach(relatedId => {
            const related = allCharacters.find(item => item.character.id === relatedId);
            if (related) {
                const icon = document.createElement('img');
                icon.className = 'related-character-icon';
                icon.src = related.character._fullProfile?.icon ||
                          `${related.color.dataPath}/characters/${related.character.id}/icon.png`;
                icon.alt = related.character.name;
                icon.title = related.character.name;
                icon.style.borderColor = related.color.colorCode;
                icon.onerror = function() {
                    this.src = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2210%22 fill=%22%23999%22%3E${related.character.name}%3C/text%3E%3C/svg%3E`;
                };
                
                icon.addEventListener('click', () => {
                    // Switch to the related character's color and then to the character
                    state.selectedColor = related.color;
                    selectCharacter({ id: related.character.id, name: related.character.name }, related.color);
                });
                
                relatedCharactersGrid.appendChild(icon);
            }
        });
        
        relatedCharacters.style.display = 'block';
    } else {
        relatedCharacters.style.display = 'none';
    }
}

// Update button color to match selected color
function updateButtonColor(colorCode) {
    const adjustedColor = getAdjustedButtonColor(colorCode);
    const buttons = document.querySelectorAll('.back-button');
    buttons.forEach(button => {
        button.style.borderColor = adjustedColor;
        button.style.color = adjustedColor;
        
        // Update hover effect
        button.onmouseenter = function() {
            this.style.backgroundColor = adjustedColor;
            this.style.color = 'white';
        };
        button.onmouseleave = function() {
            this.style.backgroundColor = 'transparent';
            this.style.color = adjustedColor;
        };
    });
}

// Get Japanese label for profile keys
function getProfileLabel(key) {
    const labels = {
        gender: '性別',
        age: '年齢',
        height: '身長',
        birthday: '誕生日',
        bloodType: '血液型',
        hobby: '趣味',
        First_person: '一人称',
        Second_person: '二人称',
        Third_person: '三人称'
    };
    return labels[key] || key;
}

// Loading indicator functions
function showLoading() {
    let loader = document.getElementById('loadingIndicator');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loadingIndicator';
        loader.className = 'loading-indicator';
        loader.innerHTML = '<div class="spinner"></div><p>読み込み中...</p>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('backToColors').addEventListener('click', () => {
        document.getElementById('characterListScreen').classList.remove('active');
        document.getElementById('colorSelectionScreen').classList.add('active');
    });
    
    document.getElementById('backToCharacters').addEventListener('click', () => {
        document.getElementById('characterProfileScreen').classList.remove('active');
        document.getElementById('characterListScreen').classList.add('active');
    });
    
    // Setup expression modal close button
    const modal = document.getElementById('expressionModal');
    const closeBtn = document.querySelector('.expression-modal-close');
    
    closeBtn.addEventListener('click', () => {
        closeExpressionModal();
    });
    
    // Close modal when clicking outside the image
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeExpressionModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeExpressionModal();
        }
    });
    
    // Setup drag-to-scroll for gradient container
    setupDragToScroll();
}

// Drag to scroll and arrow navigation functionality
function setupDragToScroll() {
    const { gradientContainer: container, gradientBar } = state.dom;
    const scrollLeftBtn = document.getElementById('scrollLeft');
    const scrollRightBtn = document.getElementById('scrollRight');
    const scrollAmount = 300;
    
    // Drag to scroll
    let isDown = false;
    let startX;
    let scrollLeft;
    
    // Mouse position tracking for auto-scroll
    let lastMouseX = null;
    let mouseTrackingActive = false;
    
    // Touch tracking for mobile devices
    let lastTouchX = null;
    let touchTrackingActive = false;
    
    // Only activate tracking when mouse is over the gradient bar itself
    gradientBar.addEventListener('mouseenter', () => {
        mouseTrackingActive = true;
        lastMouseX = null;
    });
    
    gradientBar.addEventListener('mouseleave', () => {
        mouseTrackingActive = false;
        lastMouseX = null;
    });
    
    gradientBar.addEventListener('mousemove', (e) => {
        // Track mouse movement for auto-scroll (only on gradient bar)
        if (mouseTrackingActive && !isDown) {
            const currentMouseX = e.clientX;
            
            if (lastMouseX !== null) {
                // Calculate mouse movement delta
                const deltaX = currentMouseX - lastMouseX;
                
                // Scroll based on mouse movement with amplification
                const scrollMultiplier = 2; // Amplify the scroll effect (reduced from 3 to 2)
                container.scrollLeft -= deltaX * scrollMultiplier;
            }
            
            lastMouseX = currentMouseX;
        }
    });
    
    // Touch support for mobile devices (iPad, etc.)
    gradientBar.addEventListener('touchstart', (e) => {
        touchTrackingActive = true;
        lastTouchX = e.touches[0].clientX;
    }, { passive: true });
    
    gradientBar.addEventListener('touchmove', (e) => {
        if (touchTrackingActive && lastTouchX !== null) {
            const currentTouchX = e.touches[0].clientX;
            const deltaX = currentTouchX - lastTouchX;
            
            // Scroll based on touch movement
            const scrollMultiplier = 2;
            container.scrollLeft -= deltaX * scrollMultiplier;
            
            lastTouchX = currentTouchX;
        }
    }, { passive: true });
    
    gradientBar.addEventListener('touchend', () => {
        touchTrackingActive = false;
        lastTouchX = null;
    }, { passive: true });
    
    container.addEventListener('mousemove', (e) => {
        // If dragging, use drag scroll
        if (isDown) {
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        }
    });
    
    container.addEventListener('mouseleave', () => {
        isDown = false;
        container.style.cursor = 'grab';
        mouseTrackingActive = false;
        lastMouseX = null;
    });
    
    container.addEventListener('mousedown', (e) => {
        // Don't interfere with color pointer clicks
        if (e.target.closest('.color-pointer')) {
            return;
        }
        
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        mouseTrackingActive = false; // Disable tracking while dragging
    });
    
    container.addEventListener('mouseup', () => {
        isDown = false;
        container.style.cursor = 'grab';
        lastMouseX = null;
    });
    
    // Arrow button navigation
    scrollLeftBtn.addEventListener('click', () => {
        container.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });
    
    scrollRightBtn.addEventListener('click', () => {
        container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });
    
    // Update arrow button states
    function updateArrowStates() {
        const isAtStart = container.scrollLeft <= 0;
        const isAtEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
        
        scrollLeftBtn.disabled = isAtStart;
        scrollRightBtn.disabled = isAtEnd;
    }
    
    container.addEventListener('scroll', updateArrowStates);
    updateArrowStates(); // Initial state
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Made with Bob

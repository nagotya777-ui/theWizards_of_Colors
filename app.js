// Application State
const state = {
    colors: [],
    colorDetails: {},
    characters: {},
    selectedColor: null,
    selectedCharacter: null,
    selectedArea: null,
    // Cache DOM elements
    dom: {}
};

// Cache frequently used DOM elements
function cacheDOMElements() {
    state.dom = {
        colorSelectionScreen: document.getElementById('colorSelectionScreen'),
        areaColorListScreen: document.getElementById('areaColorListScreen'),
        characterListScreen: document.getElementById('characterListScreen'),
        characterProfileScreen: document.getElementById('characterProfileScreen'),
        gradientBar: document.getElementById('gradientBar'),
        colorPointers: document.getElementById('colorPointers'),
        gradientContainer: document.querySelector('.gradient-container'),
        areaColorBackground: document.getElementById('areaColorBackground'),
        areaName: document.getElementById('areaName'),
        areaDescription: document.getElementById('areaDescription'),
        colorGrid: document.getElementById('colorGrid'),
        colorBackground: document.getElementById('colorBackground'),
        selectedColorName: document.getElementById('selectedColorName'),
        colorDescription: document.getElementById('colorDescription'),
        territoryInfo: document.getElementById('territoryInfo'),
        characterGrid: document.getElementById('characterGrid'),
        profileColorBackground: document.getElementById('profileColorBackground'),
        profileColorName: document.getElementById('profileColorName'),
        profileColorDescription: document.getElementById('profileColorDescription'),
        characterName: document.getElementById('characterName'),
        characterEngName: document.getElementById('characterEngName'),
        characterFullImage: document.getElementById('characterFullImage'),
        characterProfile: document.getElementById('characterProfile'),
        characterMagic: document.getElementById('characterMagic'),
        characterBio: document.getElementById('characterBio'),
        expressionVariations: document.getElementById('expressionVariations'),
        relatedCharacters: document.getElementById('relatedCharacters'),
        relatedCharactersGrid: document.getElementById('relatedCharactersGrid'),
        territoryMap: document.getElementById('territoryMap'),
        mapPlaceholder: document.getElementById('mapPlaceholder')
    };
}

// Initialize the application
async function init() {
    cacheDOMElements();
    await loadColorsList();
    sortColorsByHue(); // Sort colors by hue for smooth gradient
    renderGradientBar();
    setupEventListeners();
    
    // Re-render gradient bar on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            renderGradientBar();
        }, 250);
    });
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

// Cache for SVG map to avoid repeated fetches
let cachedSVG = null;

// Helper: Load SVG map with caching
async function loadSVGMap() {
    if (!cachedSVG) {
        const response = await fetch('map.svg');
        cachedSVG = await response.text();
    }
    return cachedSVG;
}

// Helper: Setup map elements and apply initial styling
function setupMapElements(svg, colorCode) {
    const regions = Array.from(svg.querySelectorAll('.area-region'));
    const unnamedAreas = Array.from(svg.querySelectorAll('.unnamed-area'));
    const labels = Array.from(svg.querySelectorAll('.area-label'));
    
    resetRegionStyles(regions, labels, colorCode);
    styleUnnamedAreas(unnamedAreas, colorCode);
    
    return { regions, labels };
}

// Helper: Highlight the area(s) associated with a color
function highlightColorArea(regions, labels, colorDetails, colorCode) {
    if (!colorDetails.area) return;
    
    // Support both single area (string) and multiple areas (array)
    const areas = Array.isArray(colorDetails.area) ? colorDetails.area : [colorDetails.area];
    const selectedRegions = [];
    
    areas.forEach(areaName => {
        const selectedRegion = regions.find(r => r.getAttribute('data-area') === areaName);
        if (selectedRegion) {
            const selectedLabel = labels.find(l => l.textContent.trim() === areaName);
            highlightRegion(selectedRegion, selectedLabel, colorCode);
            selectedRegions.push(selectedRegion);
        }
    });
    
    // Mark all non-selected regions as inactive
    if (selectedRegions.length > 0) {
        setInactiveRegions(regions, selectedRegions);
    }
}

// Helper: Reset all region styles to default
function resetRegionStyles(regions, labels, backgroundColor = null) {
    // Determine background brightness once
    let strokeColor, fillColor;
    
    if (backgroundColor) {
        const hsl = hexToHSL(backgroundColor);
        const isYellowish = (hsl.h >= 30 && hsl.h <= 90);
        const threshold = isYellowish ? 50 : 70;
        const isLightBackground = hsl.l > threshold;
        
        fillColor = backgroundColor;
        strokeColor = isLightBackground ? darkenColor(backgroundColor, 60) : lightenColor(backgroundColor, 82);
    } else {
        fillColor = '#999999';
        strokeColor = '#666666';
    }
    
    // Apply styles to all regions
    regions.forEach(region => {
        region.classList.remove('active', 'inactive');
        region.style.fill = fillColor;
        region.style.stroke = strokeColor;
    });
    
    // Apply label color once for all labels
    labels.forEach(label => {
        label.style.fill = strokeColor;
    });
}

// Helper: Style unnamed areas (slightly darker than inactive regions)
function styleUnnamedAreas(unnamedAreas, backgroundColor) {
    if (!unnamedAreas || unnamedAreas.length === 0) return;
    
    // Use the same logic as getContrastTextColor to determine if background is light or dark
    const hsl = hexToHSL(backgroundColor);
    const isYellowish = (hsl.h >= 30 && hsl.h <= 90);
    const threshold = isYellowish ? 50 : 70;
    const isLightBackground = hsl.l > threshold;
    
    unnamedAreas.forEach(area => {
        if (isLightBackground) {
            // For light backgrounds, make unnamed areas darker than inactive regions
            area.style.fill = darkenColor(backgroundColor, 40);
            area.style.stroke = darkenColor(backgroundColor, 40);
        } else {
            // For dark backgrounds, make unnamed areas slightly darker than inactive regions
            // Inactive regions are 65-70% lightened, so use 50-55% for unnamed
            area.style.fill = lightenColor(backgroundColor, 50);
            area.style.stroke = lightenColor(backgroundColor, 50);
        }
    });
}

// Helper: Darken a hex color by a percentage (preserves saturation)
function darkenColor(hex, percent = 15) {
    // Convert hex to HSL
    const hsl = hexToHSL(hex);
    
    // For yellow colors (hue 45-75), shift towards orange when darkening
    const isYellow = hsl.h >= 45 && hsl.h <= 75;
    let actualPercent = percent;
    
    if (isYellow) {
        // Shift hue slightly towards orange (reduce hue value)
        const hueShift = Math.min(8, percent * 0.2); // Reduced shift for more yellow tone
        hsl.h = Math.max(40, hsl.h - hueShift); // Don't go below golden yellow (40°)
        
        // Reduce darkening amount for yellow to prevent it from becoming too dark
        actualPercent = percent * 0.5; // 50% of the original darkening
    }
    
    // Reduce lightness while preserving saturation
    hsl.l = Math.max(0, hsl.l - actualPercent);
    
    // Convert back to hex
    return hslToHex(hsl.h, hsl.s, hsl.l);
}

// Helper: Lighten a hex color by a percentage (for border effects)
function lightenColor(hex, percent = 30) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Lighten by moving towards white
    const lightenedR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const lightenedG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const lightenedB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    
    // Convert back to hex
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(lightenedR)}${toHex(lightenedG)}${toHex(lightenedB)}`;
}

// Helper: Highlight a specific region with color
function highlightRegion(region, label, colorCode) {
    region.classList.add('active');
    
    // Use the same logic as getContrastTextColor to determine if background is light or dark
    const hsl = hexToHSL(colorCode);
    
    // Check if the color is in the yellow range (30° to 90°)
    const isYellowish = (hsl.h >= 30 && hsl.h <= 90);
    
    // Use lower threshold for yellow colors (they appear lighter)
    const threshold = isYellowish ? 50 : 70;
    
    // If lightness is greater than threshold, background is light
    const isLightBackground = hsl.l > threshold;
    
    if (isLightBackground) {
        // For light backgrounds, use a very heavily darkened version of the color
        region.style.fill = darkenColor(colorCode, 60);
        region.style.stroke = darkenColor(colorCode, 60);
        label.style.fill = darkenColor(colorCode, 0);
    } else {
        // For dark backgrounds, use white
        region.style.fill = lightenColor(colorCode, 82);
        region.style.stroke = lightenColor(colorCode, 82);
        label.style.fill = lightenColor(colorCode, 0);
    }
}

// Helper: Mark all regions except the active ones as inactive
function setInactiveRegions(regions, activeRegions) {
    // Support both single region and array of regions
    const activeRegionArray = Array.isArray(activeRegions) ? activeRegions : [activeRegions];
    
    regions.forEach(region => {
        if (!activeRegionArray.includes(region)) {
            region.classList.add('inactive');
        }
    });
}

// Helper: Attach click handler using event delegation
function attachRegionClickHandler(svg) {
    // Remove existing handlers if present to prevent duplicates
    if (svg._territoryClickHandler) {
        svg.removeEventListener('click', svg._territoryClickHandler);
        svg.removeEventListener('touchend', svg._territoryClickHandler);
    }
    
    // Create and store handler
    svg._territoryClickHandler = (event) => {
        // Prevent default for touch events to avoid double-firing
        if (event.type === 'touchend') {
            event.preventDefault();
        }
        
        // Get the target element (handle both click and touch events)
        const target = event.target;
        const region = target.closest('.area-region') || (target.classList && target.classList.contains('area-region') ? target : null);
        
        if (region) {
            const areaName = region.getAttribute('data-area');
            // Navigate to area color list screen
            selectArea(areaName);
        }
    };
    
    // Add both click and touch event listeners for mobile compatibility
    svg.addEventListener('click', svg._territoryClickHandler);
    svg.addEventListener('touchend', svg._territoryClickHandler);
}

// Load territory map for selected color
async function loadTerritoryMap(colorId) {
    // Consolidated validation
    const mapContainer = document.getElementById('mapContainer');
    const color = state.colors.find(c => c.id === colorId);
    const colorDetails = state.colorDetails[colorId];
    
    if (!mapContainer || !color || !colorDetails) {
        console.warn('Missing required elements for territory map:', {
            mapContainer: !!mapContainer,
            color: !!color,
            colorDetails: !!colorDetails
        });
        return;
    }
    
    try {
        // Load and inject SVG
        mapContainer.innerHTML = await loadSVGMap();
        
        const svg = mapContainer.querySelector('svg');
        if (!svg) return;
        
        // Setup map elements with initial styling
        const { regions, labels } = setupMapElements(svg, color.colorCode);
        
        // Highlight the area associated with this color
        highlightColorArea(regions, labels, colorDetails, color.colorCode);
        
        // Attach click handler using event delegation
        attachRegionClickHandler(svg);
        
    } catch (error) {
        console.error('Failed to load territory map:', {
            colorId,
            error: error.message,
            stack: error.stack
        });
        mapContainer.innerHTML = '<div class="map-placeholder">地図の読み込みに失敗しました</div>';
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
    
    // Detect if mobile
    const isMobile = window.innerWidth <= 768;
    
    // Create gradient from all colors with proper spacing
    const totalColors = state.colors.length;
    const gradientStops = state.colors.map((c, i) =>
        `${adjustGradientBarColor(c.colorCode)} ${(i / (totalColors - 1)) * 100}%`
    ).join(', ');
    
    // Set gradient direction based on device
    if (isMobile) {
        gradientBar.style.background = `linear-gradient(to bottom, ${gradientStops})`;
        // Reset width/height for mobile - vertical layout
        gradientBar.style.minWidth = '40px';
        gradientBar.style.width = '40px';
        gradientBar.style.minHeight = '100%';
        gradientBar.style.height = '100%';
        colorPointers.style.minWidth = 'auto';
        colorPointers.style.width = 'auto';
    } else {
        gradientBar.style.background = `linear-gradient(to right, ${gradientStops})`;
        // Adjust minimum width based on number of colors (1.2x multiplier)
        const minWidth = `${Math.max(1000, totalColors * 150) * 1.2}px`;
        gradientBar.style.minWidth = minWidth;
        gradientBar.style.width = '';
        gradientBar.style.height = '';
        colorPointers.style.minWidth = minWidth;
        colorPointers.style.width = '';
    }
    
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
    requestAnimationFrame(() => {
        if (isMobile) {
            // For mobile vertical layout, scroll to a random position vertically
            const maxScroll = gradientContainer.scrollHeight - gradientContainer.clientHeight;
            if (maxScroll > 0) {
                gradientContainer.scrollTop = Math.random() * maxScroll;
            }
        } else {
            // For desktop horizontal layout
            const maxScroll = gradientContainer.scrollWidth - gradientContainer.clientWidth;
            if (maxScroll > 0) {
                gradientContainer.scrollLeft = Math.random() * maxScroll;
            }
        }
    });
}

// Setup hover effect to show color on background
function setupGradientHoverEffect(gradientBar, colorSelectionScreen) {
    const container = state.dom.gradientContainer;
    let trackingActive = false;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const updateScrollAndBackground = (clientX) => {
        const rect = gradientBar.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = x / rect.width;
        const scrollPercentage = Math.max(0, Math.min(1, percentage));
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (maxScroll > 0 && !isTouchDevice) {
            container.scrollLeft = scrollPercentage * maxScroll;
        }

        const totalColors = state.colors.length;
        const colorIndex = Math.min(totalColors - 1, Math.max(0, Math.floor(scrollPercentage * totalColors)));
        const nextColorIndex = Math.min(colorIndex + 1, totalColors - 1);
        const localPercentage = (scrollPercentage * (totalColors - 1)) - colorIndex;
        const color1 = state.colors[colorIndex].colorCode;
        const color2 = state.colors[nextColorIndex].colorCode;
        const interpolatedColor = interpolateColor(color1, color2, localPercentage);

        colorSelectionScreen.style.backgroundColor = `${interpolatedColor}1A`;
    };

    const isWithinBarVerticalZone = (clientY) => {
        const rect = gradientBar.getBoundingClientRect();
        return clientY >= rect.top - 20 && clientY <= rect.bottom + 20;
    };

    // Only enable hover effect on non-touch devices
    if (!isTouchDevice) {
        gradientBar.addEventListener('pointerenter', () => {
            trackingActive = true;
        });

        gradientBar.addEventListener('pointerleave', (e) => {
            if (isWithinBarVerticalZone(e.clientY)) {
                return;
            }
            trackingActive = false;
            colorSelectionScreen.style.backgroundColor = '#f5f5f5';
        });

        container.addEventListener('pointermove', (e) => {
            if (!trackingActive) return;
            if (!isWithinBarVerticalZone(e.clientY)) return;
            updateScrollAndBackground(e.clientX);
        });

        container.addEventListener('pointerleave', () => {
            trackingActive = false;
            colorSelectionScreen.style.backgroundColor = '#f5f5f5';
        });
    }
}

function adjustGradientBarColor(hexColor) {
    const hsl = hexToHSL(hexColor);

    if (hsl.l >= 90) {
        hsl.l = 88;
    } else if (hsl.l > 80) {
        hsl.l -= 4;
    }

    return hslToHex(hsl.h, hsl.s, hsl.l);
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

// Select area and show colors in that area
async function selectArea(areaName) {
    state.selectedArea = areaName;
    
    // Find all colors in this area
    const colorsInArea = state.colors.filter(c => {
        const details = state.colorDetails[c.id];
        return details && details.area === areaName;
    });
    
    if (colorsInArea.length === 0) {
        console.warn('No colors found for area:', areaName);
        return;
    }
    
    // Use the first color's details to get area description (if available)
    const firstColor = colorsInArea[0];
    
    // Update area info
    state.dom.areaName.textContent = areaName;
    state.dom.areaDescription.textContent = `${areaName}に拠点を置く色の魔法使いたち`;
    
    // Set background color (use a neutral color or blend of colors in area)
    const avgColor = colorsInArea.length > 0 ? colorsInArea[0].colorCode : '#888888';
    state.dom.areaColorBackground.style.background = `linear-gradient(135deg, ${avgColor} 0%, ${lightenColor(avgColor, 20)} 100%)`;
    
    // Load and display the map
    await loadAreaMap(areaName);
    
    // Render color grid
    renderColorGrid(colorsInArea);
    
    // Switch to area color list screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    state.dom.areaColorListScreen.classList.add('active');
}

// Load territory map for area screen
async function loadAreaMap(areaName) {
    const mapContainer = document.getElementById('areaMapContainer');
    if (!mapContainer) return;
    
    try {
        // Load and inject SVG
        mapContainer.innerHTML = await loadSVGMap();
        
        // Get the SVG element
        const svg = mapContainer.querySelector('svg');
        if (!svg) return;
        
        // Get all area region elements
        const regions = Array.from(svg.querySelectorAll('.area-region'));
        const labels = Array.from(svg.querySelectorAll('.area-label'));
        
        // Reset all regions to default state
        resetRegionStyles(regions,labels);
        
        // Highlight the selected area
        const selectedRegion = regions.find(r => r.getAttribute('data-area') === areaName);
        if (selectedRegion) {
            // Use a neutral highlight color
            highlightRegion(selectedRegion, '#4A90E2');
            setInactiveRegions(regions, selectedRegion);
        }
        
        // Attach click handler for navigation
        attachRegionClickHandler(svg);
        
    } catch (error) {
        console.error('Failed to load SVG map:', error);
        mapContainer.innerHTML = '<div class="map-placeholder">地図の読み込みに失敗しました</div>';
    }
}

// Render color grid for area screen
function renderColorGrid(colors) {
    const grid = state.dom.colorGrid;
    grid.innerHTML = '';
    
    colors.forEach(color => {
        const details = state.colorDetails[color.id];
        if (!details) return;
        
        const card = document.createElement('div');
        card.className = 'color-card';
        
        // Create color header with symbol
        const header = document.createElement('div');
        header.className = 'color-card-header';
        header.style.backgroundColor = color.colorCode;
        
        const symbolDiv = document.createElement('div');
        symbolDiv.className = 'color-symbol-large';
        
        if (details.symbol && details.symbol !== 'symbol.png') {
            const symbolImg = document.createElement('img');
            symbolImg.src = `data/${details.name}/${details.symbol}`;
            symbolImg.alt = details.name;
            symbolImg.onerror = () => {
                symbolDiv.classList.add('default-circle');
                symbolDiv.style.backgroundColor = color.colorCode;
                symbolImg.remove();
            };
            symbolDiv.appendChild(symbolImg);
        } else {
            symbolDiv.classList.add('default-circle');
            symbolDiv.style.backgroundColor = color.colorCode;
        }
        
        header.appendChild(symbolDiv);
        
        // Create card body
        const body = document.createElement('div');
        body.className = 'color-card-body';
        
        const title = document.createElement('h3');
        title.textContent = details.name;
        
        const description = document.createElement('p');
        description.className = 'color-card-description';
        description.textContent = details.description;
        
        body.appendChild(title);
        body.appendChild(description);
        
        card.appendChild(header);
        card.appendChild(body);
        
        // Add click handler to navigate to character list
        card.addEventListener('click', () => {
            selectColorFromArea(color);
        });
        
        grid.appendChild(card);
    });
}

// Select color from area screen and navigate to character list
async function selectColorFromArea(color) {
    state.selectedColor = color;
    
    const details = state.colorDetails[color.id];
    if (!details) return;
    
    // Update character list screen
    state.dom.selectedColorName.textContent = details.name;
    state.dom.colorDescription.innerHTML = details.description.replace(/\n/g, '<br>');
    // Support both single area (string) and multiple areas (array)
    if (details.area) {
        const areas = Array.isArray(details.area) ? details.area.join('、') : details.area;
        state.dom.territoryInfo.textContent = `主な活動拠点: ${areas}`;
    } else {
        state.dom.territoryInfo.textContent = '';
    }
    state.dom.colorBackground.style.background = `linear-gradient(135deg, ${color.colorCode} 0%, ${lightenColor(color.colorCode, 20)} 100%)`;
    state.dom.selectedColorName.style.color = getContrastTextColor(color.colorCode);
    state.dom.colorDescription.style.color = getContrastTextColor(color.colorCode);
    state.dom.territoryInfo.style.color = getContrastTextColor(color.colorCode);
    
    // Load territory map
    await loadTerritoryMap(color.id);
    
    // Load and render characters
    await loadCharactersForColor(color);
    renderCharacterGrid(state.characters[color.id] || [], color);
    
    // Update button colors
    updateButtonColor(color.colorCode);
    
    // Switch to character list screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    state.dom.characterListScreen.classList.add('active');
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
            colorBackground, selectedColorName, colorDescription, territoryMap, mapPlaceholder } = state.dom;
    
    colorSelectionScreen.classList.remove('active');
    characterListScreen.classList.remove('active');
    characterProfileScreen.classList.remove('active');
    
    // Show character list screen
    characterListScreen.classList.add('active');
    
    // Set background color
    colorBackground.style.backgroundColor = color.colorCode;
    selectedColorName.textContent = color.name;
    selectedColorName.style.color = getContrastTextColor(color.colorCode);
    colorDescription.innerHTML = (details?.description || '').replace(/\n/g, '<br>');
    colorDescription.style.color = getContrastTextColor(color.colorCode);
    // Support both single area (string) and multiple areas (array)
    if (details?.area) {
        const areas = Array.isArray(details.area) ? details.area.join('、') : details.area;
        state.dom.territoryInfo.textContent = `主な活動拠点: ${areas}`;
    } else {
        state.dom.territoryInfo.textContent = '';
    }
    state.dom.territoryInfo.style.color = getContrastTextColor(color.colorCode);
    
    // Load territory map
    loadTerritoryMap(color.id);
    
    // Update back button color
    updateButtonColor(color.colorCode);
    
    // Render character grid
    renderCharacterGrid(characters, color);
    
    // Auto-scroll to character list (with mobile optimization)
    setTimeout(() => {
        const characterListContainer = document.querySelector('.character-list-container');
        if (characterListContainer) {
            // On mobile, scroll to top of character list
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                characterListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
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
                <h3>
                    <span>${character.name}</span>
                    <small class="character-eng-name">${character.id}</small>
                </h3>
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
    const { characterName, characterEngName, characterFullImage, characterProfile,
            characterMagic, characterBio } = state.dom;

    function parseMagicSection(character) {
        return {
            title: character.magicTitle ? String(character.magicTitle).trim() : '',
            description: character.magicDescription ? String(character.magicDescription).trim() : ''
        };
    }
    
    characterName.textContent = character.name;
    characterEngName.textContent = character.id;
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
    
    // Render magic section with separate title and description
    const magicSection = parseMagicSection(character);
    characterMagic.innerHTML = '';
    if (magicSection.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'magic-title';
        titleEl.textContent = magicSection.title;
        characterMagic.appendChild(titleEl);
    }
    const textEl = document.createElement('div');
    textEl.className = 'magic-text';
    textEl.textContent = magicSection.description;
    characterMagic.appendChild(textEl);
    
    // Render bio
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
    document.getElementById('backToColorSelection').addEventListener('click', () => {
        document.getElementById('areaColorListScreen').classList.remove('active');
        document.getElementById('colorSelectionScreen').classList.add('active');
    });
    
    document.getElementById('backToColors').addEventListener('click', () => {
        document.getElementById('characterListScreen').classList.remove('active');
        // Go back to area screen if we came from there, otherwise to color selection
        if (state.selectedArea) {
            document.getElementById('areaColorListScreen').classList.add('active');
        } else {
            document.getElementById('colorSelectionScreen').classList.add('active');
        }
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
    let lastTouchX = null;
    let touchStartTime = 0;
    let touchStartX = 0;
    let velocity = 0;
    let momentumAnimation = null;
    
    // Detect if device is touch-enabled
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    // Mouse drag for desktop
    container.addEventListener('mousemove', (e) => {
        if (isDown && !isTouchDevice) {
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        }
    });
    
    container.addEventListener('mousedown', (e) => {
        // Don't interfere with color pointer clicks
        if (e.target.closest('.color-pointer') || isTouchDevice) {
            return;
        }
        
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    });
    
    container.addEventListener('mouseup', () => {
        if (!isTouchDevice) {
            isDown = false;
            container.style.cursor = 'grab';
        }
    });
    
    container.addEventListener('mouseleave', () => {
        if (!isTouchDevice) {
            isDown = false;
            container.style.cursor = 'grab';
        }
    });
    
    // Touch handling for mobile with momentum scrolling
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        
        // Cancel any ongoing momentum
        if (momentumAnimation) {
            cancelAnimationFrame(momentumAnimation);
            momentumAnimation = null;
        }
        
        isDown = true;
        touchStartTime = Date.now();
        lastTouchX = e.touches[0].clientX;
        touchStartX = lastTouchX;
        scrollLeft = container.scrollLeft;
        velocity = 0;
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
        if (!isDown || lastTouchX === null) return;
        
        const currentTouchX = e.touches[0].clientX;
        const deltaX = lastTouchX - currentTouchX;
        const currentTime = Date.now();
        const deltaTime = currentTime - touchStartTime;
        
        // Calculate velocity for momentum
        if (deltaTime > 0) {
            velocity = deltaX / deltaTime;
        }
        
        container.scrollLeft = scrollLeft + (currentTouchX - touchStartX) * -1;
        lastTouchX = currentTouchX;
        touchStartTime = currentTime;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        isDown = false;
        lastTouchX = null;
        
        // Apply momentum scrolling
        if (Math.abs(velocity) > 0.5) {
            applyMomentum();
        }
    }, { passive: true });
    
    // Momentum scrolling function
    function applyMomentum() {
        const friction = 0.95;
        const minVelocity = 0.1;
        
        function animate() {
            velocity *= friction;
            
            if (Math.abs(velocity) < minVelocity) {
                momentumAnimation = null;
                return;
            }
            
            container.scrollLeft += velocity * 16; // 16ms frame time
            momentumAnimation = requestAnimationFrame(animate);
        }
        
        animate();
    }
    
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

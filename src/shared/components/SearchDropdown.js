/**
 * Reusable Search Dropdown Component
 * Used across all player guessing games
 */
class SearchDropdown {
    constructor(options = {}) {
        this.options = {
            inputId: options.inputId || 'searchInput',
            dropdownId: options.dropdownId || 'searchDropdown',
            placeholder: options.placeholder || 'Search...',
            onSelect: options.onSelect || (() => {}),
            onFilter: options.onFilter || (() => []),
            debounceDelay: options.debounceDelay || 300,
            maxResults: options.maxResults || 50,
            ...options
        };
        
        this.filteredItems = [];
        this.highlightedIndex = -1;
        this.selectedItem = null;
        this.debounceTimer = null;
        this.isVisible = false;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupAccessibility();
    }
    
    cacheElements() {
        this.input = document.getElementById(this.options.inputId);
        this.dropdown = document.getElementById(this.options.dropdownId);
        
        if (!this.input || !this.dropdown) {
            console.error('SearchDropdown: Required elements not found');
            return;
        }
        
        // Setup initial attributes
        this.input.placeholder = this.options.placeholder;
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('role', 'combobox');
        this.input.setAttribute('aria-expanded', 'false');
        this.input.setAttribute('aria-haspopup', 'listbox');
        
        this.dropdown.setAttribute('role', 'listbox');
        this.dropdown.setAttribute('aria-label', 'Search suggestions');
        this.dropdown.classList.add('search-dropdown');
    }
    
    setupEventListeners() {
        // Input events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('focus', (e) => this.handleFocus(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.input.addEventListener('blur', (e) => this.handleBlur(e));
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.hide();
            }
        });
    }
    
    setupAccessibility() {
        // Link input to dropdown for screen readers
        this.input.setAttribute('aria-controls', this.options.dropdownId);
        this.dropdown.setAttribute('aria-labelledby', this.options.inputId);
    }
    
    handleInput(e) {
        const value = e.target.value.trim();
        
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch(value);
        }, this.options.debounceDelay);
    }
    
    handleFocus(e) {
        if (e.target.value.trim() && this.filteredItems.length > 0) {
            this.show();
        }
    }
    
    handleKeydown(e) {
        if (!this.isVisible || this.filteredItems.length === 0) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.highlightedIndex = Math.min(
                    this.highlightedIndex + 1, 
                    this.filteredItems.length - 1
                );
                this.updateHighlight();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
                this.updateHighlight();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.highlightedIndex >= 0) {
                    this.selectItem(this.filteredItems[this.highlightedIndex]);
                }
                break;
                
            case 'Escape':
                this.hide();
                break;
        }
    }
    
    handleBlur(e) {
        // Delay hiding to allow clicking on dropdown items
        setTimeout(() => {
            if (!this.dropdown.contains(document.activeElement)) {
                this.hide();
            }
        }, 150);
    }
    
    performSearch(query) {
        if (!query) {
            this.hide();
            return;
        }
        
        try {
            this.filteredItems = this.options.onFilter(query)
                .slice(0, this.options.maxResults);
            
            this.highlightedIndex = -1;
            this.renderResults();
            
            if (this.filteredItems.length > 0) {
                this.show();
            } else {
                this.hide();
            }
        } catch (error) {
            console.error('SearchDropdown: Error during search', error);
            this.showError('Search failed. Please try again.');
        }
    }
    
    renderResults() {
        if (this.filteredItems.length === 0) {
            this.dropdown.innerHTML = '<div class="dropdown-empty">No results found</div>';
            return;
        }
        
        this.dropdown.innerHTML = this.filteredItems.map((item, index) => {
            const displayText = this.options.formatItem ? 
                this.options.formatItem(item) : 
                item.toString();
                
            return `
                <div class="dropdown-item" 
                     data-index="${index}"
                     role="option"
                     aria-selected="${index === this.highlightedIndex}"
                     tabindex="-1">
                    ${displayText}
                </div>
            `;
        }).join('');
        
        this.setupItemListeners();
    }
    
    setupItemListeners() {
        this.dropdown.querySelectorAll('.dropdown-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectItem(this.filteredItems[index]);
            });
            
            item.addEventListener('mouseenter', () => {
                this.highlightedIndex = index;
                this.updateHighlight();
            });
        });
    }
    
    updateHighlight() {
        const items = this.dropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            const isHighlighted = index === this.highlightedIndex;
            item.classList.toggle('highlighted', isHighlighted);
            item.setAttribute('aria-selected', isHighlighted);
        });
    }
    
    selectItem(item) {
        this.selectedItem = item;
        
        // Update input value
        const displayValue = this.options.getDisplayValue ? 
            this.options.getDisplayValue(item) : 
            item.toString();
        this.input.value = displayValue;
        
        // Hide dropdown
        this.hide();
        
        // Trigger callback
        this.options.onSelect(item);
        
        // Trigger change event
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    show() {
        this.isVisible = true;
        this.dropdown.classList.add('visible');
        this.input.setAttribute('aria-expanded', 'true');
    }
    
    hide() {
        this.isVisible = false;
        this.dropdown.classList.remove('visible');
        this.input.setAttribute('aria-expanded', 'false');
        this.highlightedIndex = -1;
    }
    
    showError(message) {
        this.dropdown.innerHTML = `<div class="dropdown-error">${message}</div>`;
        this.show();
    }
    
    clear() {
        this.input.value = '';
        this.selectedItem = null;
        this.hide();
    }
    
    getSelectedItem() {
        return this.selectedItem;
    }
    
    destroy() {
        clearTimeout(this.debounceTimer);
        // Remove event listeners would go here
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchDropdown;
} else {
    window.SearchDropdown = SearchDropdown;
} 
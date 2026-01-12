class TruthOrDareGame {
    constructor() {
        // Game state
        this.packages = [];
        this.selectedPackages = [];
        this.currentRound = 1;
        this.lastUsedPackage = null;
        this.lastCardType = null;
        this.darkMode = false;
        this.isInGame = false; // Track if we're in an active game
        
        // Initialize
        this.initializeElements();
        this.loadSettings();
        this.loadPackages();
        this.bindEvents();
    }

    initializeElements() {
        // Setup screen elements
        this.setupScreen = document.getElementById('setup-screen');
        this.darkModeCheckbox = document.getElementById('dark-mode');
        this.packagesList = document.getElementById('packages-list');
        this.startGameBtn = document.getElementById('start-game');

        // Game screen elements
        this.gameScreen = document.getElementById('game-screen');
        this.backBtn = document.getElementById('back-btn');
        this.roundNumberDisplay = document.getElementById('round-number');
        this.cardElement = document.querySelector('.card');
        this.cardPackageDisplay = document.getElementById('card-package-name');
        this.cardTypeDisplay = document.getElementById('card-type-text');
        this.cardTextDisplay = document.getElementById('card-text');
        this.passBtnGame = document.getElementById('pass-btn');
        this.truthBtn = document.getElementById('truth-btn');
        this.dareBtn = document.getElementById('dare-btn');

        // Toast
        this.toast = document.getElementById('toast');

        // Continue Modal (on page load)
        this.continueModal = document.getElementById('continue-modal');
        this.modalRound = document.getElementById('modal-round');
        this.modalLastType = document.getElementById('modal-last-type');
        this.continueGameBtn = document.getElementById('continue-game-btn');
        this.newGameModalBtn = document.getElementById('new-game-modal-btn');

        // Start Game Modal (when clicking "Játék indítása" during active game)
        this.startGameModal = document.getElementById('start-game-modal');
        this.startModalRound = document.getElementById('start-modal-round');
        this.startModalLastType = document.getElementById('start-modal-last-type');
        this.continueStartBtn = document.getElementById('continue-start-btn');
        this.newStartBtn = document.getElementById('new-start-btn');
    }


    async loadPackages() {
        try {
            const response = await fetch('assets/card_mapping.json');
            const packagesData = await response.json();
            
            // Initialize package structure
            this.packages = packagesData.map(pkg => ({
                ...pkg,
                truthCards: [],
                dareCards: [],
                truthIndex: 0,
                dareIndex: 0
            }));
            
            // Render package checkboxes
            this.renderPackages();
            
            // Check for saved game state
            this.checkSavedGameState();
            
            console.log(`Loaded ${this.packages.length} packages`);
        } catch (error) {
            console.error('Error loading packages:', error);
            this.showToast('Hiba: Nem sikerült betölteni a kérdéscsomagokat.');
        }
    }

    renderPackages() {
        this.packagesList.innerHTML = '';
        
        this.packages.forEach(pkg => {
            const packageItem = document.createElement('div');
            packageItem.className = 'package-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `package-${pkg.id}`;
            checkbox.dataset.packageId = pkg.id;
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.htmlFor = `package-${pkg.id}`;
            
            const checkmark = document.createElement('span');
            checkmark.className = 'checkmark';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = pkg.name;
            
            label.appendChild(checkbox);
            label.appendChild(checkmark);
            label.appendChild(nameSpan);
            
            const description = document.createElement('div');
            description.className = 'package-description';
            description.textContent = pkg.description;
            
            packageItem.appendChild(label);
            packageItem.appendChild(description);
            
            this.packagesList.appendChild(packageItem);
            
            // Event listener for checkbox
            checkbox.addEventListener('change', () => this.updateSelectedPackages());
        });
        
        // Load saved package selections
        this.loadPackageSelections();
    }

    updateSelectedPackages() {
        const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]');
        const selectedIds = [];
        
        checkboxes.forEach(cb => {
            if (cb.checked) {
                selectedIds.push(parseInt(cb.dataset.packageId));
            }
        });
        
        // Enable/disable start button
        this.startGameBtn.disabled = selectedIds.length === 0;
        
        // Save selections
        this.savePackageSelections(selectedIds);
    }

    bindEvents() {
        // Dark mode toggle
        this.darkModeCheckbox.addEventListener('change', (e) => {
            this.darkMode = e.target.checked;
            this.updateDarkMode();
            this.saveSettings();
        });

        // Start game
        this.startGameBtn.addEventListener('click', () => this.startGame());

        // Game controls
        this.backBtn.addEventListener('click', () => this.backToSetup());
        
        // Long-press for Passz button
        this.passTimeout = null;
        this.passBtnGame.addEventListener('mousedown', () => this.startPassPress());
        this.passBtnGame.addEventListener('mouseup', () => this.cancelPassPress());
        this.passBtnGame.addEventListener('mouseleave', () => this.cancelPassPress());
        this.passBtnGame.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startPassPress();
        });
        this.passBtnGame.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.cancelPassPress();
        });
        
        this.truthBtn.addEventListener('click', () => this.drawCard('truth'));
        this.dareBtn.addEventListener('click', () => this.drawCard('dare'));

        // Continue Modal buttons (page load)
        this.continueGameBtn.addEventListener('click', () => this.continueGame());
        this.newGameModalBtn.addEventListener('click', () => this.startNewGame());

        // Start Game Modal buttons (during active game)
        this.continueStartBtn.addEventListener('click', () => this.continueWithChanges());
        this.newStartBtn.addEventListener('click', () => this.startCompletelyNewGame());
    }

    startPassPress() {
        // Add class for animation
        this.passBtnGame.classList.add('pressing');
        
        // Set timeout for 1 second
        this.passTimeout = setTimeout(() => {
            this.passCard();
            this.cancelPassPress();
        }, 1000);
    }

    cancelPassPress() {
        // Clear timeout
        if (this.passTimeout) {
            clearTimeout(this.passTimeout);
            this.passTimeout = null;
        }
        
        // Remove animation class
        this.passBtnGame.classList.remove('pressing');
    }

    loadSettings() {
        // Load dark mode
        const savedDarkMode = localStorage.getItem('truthOrDare_darkMode');
        if (savedDarkMode !== null) {
            this.darkMode = savedDarkMode === 'true';
            this.darkModeCheckbox.checked = this.darkMode;
            this.updateDarkMode();
        }
    }

    saveSettings() {
        localStorage.setItem('truthOrDare_darkMode', this.darkMode.toString());
    }

    loadPackageSelections() {
        const saved = localStorage.getItem('truthOrDare_selectedPackages');
        if (saved) {
            try {
                const selectedIds = JSON.parse(saved);
                const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]');
                
                checkboxes.forEach(cb => {
                    if (selectedIds.includes(parseInt(cb.dataset.packageId))) {
                        cb.checked = true;
                    }
                });
                
                this.updateSelectedPackages();
            } catch (error) {
                console.error('Error loading package selections:', error);
            }
        }
    }

    savePackageSelections(selectedIds) {
        localStorage.setItem('truthOrDare_selectedPackages', JSON.stringify(selectedIds));
    }

    updateDarkMode() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // ========== GAME STATE PERSISTENCE ==========

    checkSavedGameState() {
        const savedState = this.loadGameState();
        if (savedState) {
            // Set checkboxes to match saved state
            const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                cb.checked = savedState.selectedPackageIds.includes(parseInt(cb.dataset.packageId));
            });
            this.updateSelectedPackages();
            
            // Show modal
            this.showContinueModal(savedState);
        }
    }

    showContinueModal(savedState) {
        this.modalRound.textContent = savedState.currentRound;
        this.modalLastType.textContent = savedState.lastCardType === 'truth' ? 'Felelsz' : 
                                        savedState.lastCardType === 'dare' ? 'Mersz' : '-';
        this.continueModal.classList.add('show');
    }

    hideContinueModal() {
        this.continueModal.classList.remove('show');
    }

    showStartGameModal() {
        this.startModalRound.textContent = this.currentRound;
        this.startModalLastType.textContent = this.lastCardType === 'truth' ? 'Felelsz' : 
                                            this.lastCardType === 'dare' ? 'Mersz' : '-';
        this.startGameModal.classList.add('show');
    }

    hideStartGameModal() {
        this.startGameModal.classList.remove('show');
    }

    async continueWithChanges() {
        this.hideStartGameModal();
        
        // Get selected packages from checkboxes
        const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.packageId));
        
        // Handle package changes
        await this.handlePackageChanges(selectedIds);
        
        // Show game screen
        this.showScreen('game-screen');
        this.roundNumberDisplay.textContent = this.currentRound;
        
        // Show initial message
        this.cardPackageDisplay.textContent = 'Válassz!';
        this.cardTypeDisplay.textContent = 'FELELSZ VAGY MERSZ?';
        this.cardTextDisplay.textContent = 'Válaszd ki lent, hogy Felelsz vagy Mersz kártyát szeretnél.';
        
        // Save state
        this.saveGameState();
        
        this.showToast('Játék folytatása módosított beállításokkal...');
    }

    async startCompletelyNewGame() {
        this.hideStartGameModal();
        
        // Clear game state
        this.clearGameState();
        this.isInGame = false;
        
        // Reset all package indexes
        this.packages.forEach(pkg => {
            pkg.truthIndex = 0;
            pkg.dareIndex = 0;
            pkg.truthCards = [];
            pkg.dareCards = [];
        });
        
        // Get selected packages from checkboxes
        const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.packageId));
        
        // Load all selected packages fresh
        this.selectedPackages = [];
        for (const id of selectedIds) {
            const pkg = this.packages.find(p => p.id === id);
            if (pkg) {
                await this.loadPackageCards(pkg);
                this.selectedPackages.push(pkg);
            }
        }
        
        // Reset game state for new game
        this.currentRound = 1;
        this.lastUsedPackage = null;
        this.lastCardType = null;
        this.isInGame = true;
        
        // Show game screen
        this.showScreen('game-screen');
        this.roundNumberDisplay.textContent = this.currentRound;
        
        // Show initial message
        this.cardPackageDisplay.textContent = 'Válassz!';
        this.cardTypeDisplay.textContent = 'FELELSZ VAGY MERSZ?';
        this.cardTextDisplay.textContent = 'Válaszd ki lent, hogy Felelsz vagy Mersz kártyát szeretnél.';
        
        // Save state
        this.saveGameState();
        
        this.showToast('Új játék indul...');
    }

    saveGameState() {
        const state = {
            timestamp: Date.now(),
            currentRound: this.currentRound,
            lastUsedPackageId: this.lastUsedPackage?.id || null,
            lastCardType: this.lastCardType,
            selectedPackageIds: this.selectedPackages.map(p => p.id),
            packageStates: this.selectedPackages.map(pkg => ({
                id: pkg.id,
                truthIndex: pkg.truthIndex,
                dareIndex: pkg.dareIndex,
                truthCards: pkg.truthCards,
                dareCards: pkg.dareCards
            }))
        };
        
        localStorage.setItem('truthOrDare_gameState', JSON.stringify(state));
        console.log('Game state saved', state);
    }

    loadGameState() {
        const saved = localStorage.getItem('truthOrDare_gameState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                
                // Check if older than 7 days
                const ageInDays = (Date.now() - state.timestamp) / (1000 * 60 * 60 * 24);
                if (ageInDays > 7) {
                    console.log('Game state expired (>7 days)');
                    localStorage.removeItem('truthOrDare_gameState');
                    return null;
                }
                
                return state;
            } catch (error) {
                console.error('Error loading game state:', error);
                return null;
            }
        }
        return null;
    }

    clearGameState() {
        localStorage.removeItem('truthOrDare_gameState');
        console.log('Game state cleared');
    }

    async continueGame() {
        this.hideContinueModal();
        
        const savedState = this.loadGameState();
        if (!savedState) {
            this.showToast('Nem sikerült betölteni a játékállást.');
            return;
        }
        
        // Restore packages with their states
        this.selectedPackages = [];
        for (const pkgState of savedState.packageStates) {
            const pkg = this.packages.find(p => p.id === pkgState.id);
            if (pkg) {
                pkg.truthCards = pkgState.truthCards;
                pkg.dareCards = pkgState.dareCards;
                pkg.truthIndex = pkgState.truthIndex;
                pkg.dareIndex = pkgState.dareIndex;
                this.selectedPackages.push(pkg);
            }
        }
        
        // Restore game state
        this.currentRound = savedState.currentRound;
        this.lastCardType = savedState.lastCardType;
        this.lastUsedPackage = this.selectedPackages.find(p => p.id === savedState.lastUsedPackageId) || null;
        this.isInGame = true;
        
        // Show game screen
        this.showScreen('game-screen');
        this.roundNumberDisplay.textContent = this.currentRound;
        
        // Show initial message
        this.cardPackageDisplay.textContent = 'Válassz!';
        this.cardTypeDisplay.textContent = 'FELELSZ VAGY MERSZ?';
        this.cardTextDisplay.textContent = 'Válaszd ki lent, hogy Felelsz vagy Mersz kártyát szeretnél.';
        
        this.showToast('Játék folytatása...');
    }

    startNewGame() {
        this.hideContinueModal();
        this.clearGameState();
        // Reset all package indexes
        this.packages.forEach(pkg => {
            pkg.truthIndex = 0;
            pkg.dareIndex = 0;
            pkg.truthCards = [];
            pkg.dareCards = [];
        });
        this.showToast('Új játék indul...');
    }

    async startGame() {
        // Get selected packages from checkboxes
        const checkboxes = this.packagesList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.packageId));
        
        if (selectedIds.length === 0) {
            this.showToast('Kérlek válassz legalább egy kérdéscsomagot!');
            return;
        }
        
        // If we're in an active game, show modal to ask user
        if (this.isInGame) {
            this.showStartGameModal();
            return;
        } else {
            // Fresh start - load all selected packages
            this.selectedPackages = [];
            for (const id of selectedIds) {
                const pkg = this.packages.find(p => p.id === id);
                if (pkg) {
                    await this.loadPackageCards(pkg);
                    this.selectedPackages.push(pkg);
                }
            }
            
            // Reset game state for new game
            this.currentRound = 1;
            this.lastUsedPackage = null;
            this.lastCardType = null;
        }
        
        this.isInGame = true;
        
        // Show game screen
        this.showScreen('game-screen');
        this.roundNumberDisplay.textContent = this.currentRound;
        
        // Show initial message
        this.cardPackageDisplay.textContent = 'Válassz!';
        this.cardTypeDisplay.textContent = 'FELELSZ VAGY MERSZ?';
        this.cardTextDisplay.textContent = 'Válaszd ki lent, hogy Felelsz vagy Mersz kártyát szeretnél.';
        
        // Save state
        this.saveGameState();
    }

    async handlePackageChanges(newSelectedIds) {
        // Keep existing packages that are still selected
        const existingPackages = this.selectedPackages.filter(pkg => 
            newSelectedIds.includes(pkg.id)
        );
        
        // Find packages that were removed
        const removedPackages = this.selectedPackages.filter(pkg =>
            !newSelectedIds.includes(pkg.id)
        );
        
        // Check if lastUsedPackage was removed
        if (this.lastUsedPackage && !newSelectedIds.includes(this.lastUsedPackage.id)) {
            this.showToast('Az utolsó csomag eltávolítva. Passz nem elérhető.');
            this.lastUsedPackage = null;
            this.lastCardType = null;
        }
        
        // Find new packages to add
        const newIds = newSelectedIds.filter(id => 
            !this.selectedPackages.some(pkg => pkg.id === id)
        );
        
        // Load new packages OR restore from saved state
        const savedState = this.loadGameState();
        for (const newId of newIds) {
            const pkg = this.packages.find(p => p.id === newId);
            if (pkg) {
                // Check if we have saved state for this package
                const savedPkgState = savedState?.packageStates.find(ps => ps.id === newId);
                
                if (savedPkgState) {
                    // Restore saved state (OPTION B)
                    pkg.truthCards = savedPkgState.truthCards;
                    pkg.dareCards = savedPkgState.dareCards;
                    pkg.truthIndex = savedPkgState.truthIndex;
                    pkg.dareIndex = savedPkgState.dareIndex;
                    console.log(`Restored ${pkg.name} from saved state`);
                } else {
                    // Fresh load
                    await this.loadPackageCards(pkg);
                }
                
                existingPackages.push(pkg);
            }
        }
        
        this.selectedPackages = existingPackages;
    }

    async loadPackageCards(pkg) {
        try {
            // Load truth cards
            const truthResponse = await fetch(`assets/${pkg.truth}`);
            const truthText = await truthResponse.text();
            pkg.truthCards = truthText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            // Load dare cards
            const dareResponse = await fetch(`assets/${pkg.dare}`);
            const dareText = await dareResponse.text();
            pkg.dareCards = dareText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            // Shuffle cards
            this.shuffleArray(pkg.truthCards);
            this.shuffleArray(pkg.dareCards);
            
            // Reset indexes
            pkg.truthIndex = 0;
            pkg.dareIndex = 0;
            
            console.log(`Loaded ${pkg.name}: ${pkg.truthCards.length} truth, ${pkg.dareCards.length} dare`);
        } catch (error) {
            console.error(`Error loading cards for ${pkg.name}:`, error);
            this.showToast(`Hiba: Nem sikerült betölteni a(z) ${pkg.name} kártyáit.`);
        }
    }

    async loadCards() {
        for (const pkg of this.selectedPackages) {
            await this.loadPackageCards(pkg);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    drawCard(type) {
        // Get available packages
        const available = this.selectedPackages.filter(pkg => 
            type === 'truth' 
                ? pkg.truthIndex < pkg.truthCards.length
                : pkg.dareIndex < pkg.dareCards.length
        );
        
        // If no cards available, reset
        if (available.length === 0) {
            this.resetIndexes(type);
            this.showToast(`Minden ${type === 'truth' ? 'Felelsz' : 'Mersz'} kártya lejátszva! Újrakezdés...`);
            return this.drawCard(type); // Recursive call after reset
        }
        
        // Weighted random selection
        const totalRemaining = available.reduce((sum, pkg) => 
            sum + (type === 'truth' 
                ? pkg.truthCards.length - pkg.truthIndex
                : pkg.dareCards.length - pkg.dareIndex
            ), 0
        );
        
        let random = Math.random() * totalRemaining;
        let chosenPackage = null;
        
        for (const pkg of available) {
            const remaining = type === 'truth'
                ? pkg.truthCards.length - pkg.truthIndex
                : pkg.dareCards.length - pkg.dareIndex;
            
            random -= remaining;
            if (random <= 0) {
                chosenPackage = pkg;
                break;
            }
        }
        
        // Draw card
        const card = type === 'truth'
            ? chosenPackage.truthCards[chosenPackage.truthIndex++]
            : chosenPackage.dareCards[chosenPackage.dareIndex++];
        
        // Save state
        this.lastUsedPackage = chosenPackage;
        this.lastCardType = type;
        this.currentRound++;
        
        // Display card
        this.displayCard(card, chosenPackage.name, type);
        
        // Save to localStorage
        this.saveGameState();
    }

    passCard() {
        if (!this.lastUsedPackage || !this.lastCardType) {
            this.showToast('Először húzz egy kártyát!');
            return;
        }
        
        const type = this.lastCardType;
        
        // Check if package has more cards
        const hasCards = type === 'truth'
            ? this.lastUsedPackage.truthIndex < this.lastUsedPackage.truthCards.length
            : this.lastUsedPackage.dareIndex < this.lastUsedPackage.dareCards.length;
        
        if (hasCards) {
            // Don't increment round for pass
            this.currentRound--;
            
            // Draw from same package
            const card = type === 'truth'
                ? this.lastUsedPackage.truthCards[this.lastUsedPackage.truthIndex++]
                : this.lastUsedPackage.dareCards[this.lastUsedPackage.dareIndex++];
            
            this.currentRound++; // Will be incremented back to same value
            
            this.displayCard(card, this.lastUsedPackage.name, type);
            
            // Save state
            this.saveGameState();
        } else {
            // No more cards in this package
            this.showToast('Ebből a kategóriából elfogytak a kártyák.');
            this.drawCard(type); // Draw from another package
        }
    }

    displayCard(card, packageName, type) {
        // Trigger exit animation for current card
        this.cardElement.classList.add('card-exit');
        
        // After exit animation, update content and trigger enter animation
        setTimeout(() => {
            // Remove exit class
            this.cardElement.classList.remove('card-exit');
            
            // Update card content
            this.cardPackageDisplay.textContent = packageName;
            this.cardTypeDisplay.textContent = type === 'truth' ? 'FELELSZ' : 'MERSZ';
            
            // Add appropriate class for styling
            this.cardTypeDisplay.classList.remove('truth', 'dare');
            this.cardTypeDisplay.classList.add(type);
            
            this.cardTextDisplay.textContent = card;
            this.roundNumberDisplay.textContent = this.currentRound;
            
            // Trigger enter animation
            this.cardElement.classList.add('card-enter');
            
            // Remove enter class after animation completes
            setTimeout(() => {
                this.cardElement.classList.remove('card-enter');
            }, 700);
        }, 500); // Duration of exit animation
    }

    resetIndexes(type) {
        this.selectedPackages.forEach(pkg => {
            if (type === 'truth') {
                pkg.truthIndex = 0;
                this.shuffleArray(pkg.truthCards);
            } else {
                pkg.dareIndex = 0;
                this.shuffleArray(pkg.dareCards);
            }
        });
        
        // Save state after reset
        this.saveGameState();
    }

    backToSetup() {
        // DON'T reset state - just go back to setup screen
        this.showScreen('setup-screen');
        // isInGame stays true, state is preserved
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenId).classList.add('active');
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new TruthOrDareGame();
});

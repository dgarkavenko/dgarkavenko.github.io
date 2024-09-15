// cryptogram.js

const secretPhrase = `
Progress has been made. The transplants are working. The subject is seeing beyond the veil — what they perceive is extraordinary.
However, their mind is fragile and unstable. Time is of the essence we must immediately assemble the Inner Circle.
The breakthrough is imminent, but demands swift action.
Dr. Varrick Sawn`.toUpperCase();

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let cipher = {};
let selectedLetter = null; // Store the selected cryptogram letter

// Generate a simple substitution cipher
function generateCipher() {
    let shuffledAlphabet = alphabet.split('').sort(() => 0.5 - Math.random()).join('');
    for (let i = 0; i < alphabet.length; i++) {
        cipher[alphabet[i]] = shuffledAlphabet[i];
    }
}

// Encode the phrase using the cipher
function encodePhrase(phrase) {
    return phrase.split('').map(char => {
        if (alphabet.includes(char)) {
            return cipher[char];
        } else {
            return char;  // Non-alphabetic characters stay the same (punctuation, spaces, etc.)
        }
    }).join('');
}

// Initialize the cryptogram display with guess input spaces
function initializeCryptogram(cryptogram) {
    const container = document.getElementById('cryptogram');
    container.innerHTML = '';

    const paragraphs = cryptogram.split('\n');  // Split the phrase by new lines for paragraphs

    paragraphs.forEach(paragraph => {
        let paragraphDiv = document.createElement('div');
        paragraphDiv.classList.add('paragraph');

        const words = paragraph.split(' ');  // Split the paragraph into words

        words.forEach(word => {
            let wordSpan = document.createElement('span');
            wordSpan.classList.add('word');  // Add a word-level span to prevent word breaking

            word.split('').forEach(char => {
                let letterDiv = document.createElement('span');
                letterDiv.classList.add('cryptogram-letter');

                if (alphabet.includes(char)) {
                    // Only alphabetic characters are interactive
                    let guessDiv = document.createElement('div');
                    guessDiv.classList.add('guess');
                    guessDiv.setAttribute('data-letter', char);  // Store the encoded letter
                    guessDiv.textContent = '_';  // Placeholder for the guess

                    let letterSpan = document.createElement('span');
                    letterSpan.textContent = char;  // Show encoded letter

                    // Add click listener to highlight selected letters
                    guessDiv.addEventListener('click', () => selectLetter(char));

                    letterDiv.appendChild(guessDiv);
                    letterDiv.appendChild(letterSpan);
                } else {
                    // Non-alphabetic characters are just displayed as-is
                    letterDiv.textContent = char;
                }

                wordSpan.appendChild(letterDiv);
            });

            paragraphDiv.appendChild(wordSpan);
        });

        container.appendChild(paragraphDiv);
    });
}

// Highlight selected letter in the cryptogram
function selectLetter(letter) {
    selectedLetter = letter; // Store the selected letter
    let allLetters = document.querySelectorAll('.cryptogram-container .guess');
    allLetters.forEach(guess => {
        if (guess.getAttribute('data-letter') === letter) {
            guess.classList.add('highlight');
        } else {
            guess.classList.remove('highlight');
        }
    });
}

// Replace all instances of the selected letter with the guessed letter
function replaceLetter(guessedLetter) {
    if (selectedLetter) {
        let allLetters = document.querySelectorAll('.cryptogram-container .guess');
        allLetters.forEach(guess => {
            if (guess.getAttribute('data-letter') === selectedLetter) {
                guess.textContent = guessedLetter;
            }
        });
        selectedLetter = null; // Reset after guess
        clearHighlights();
    } else {
        alert("Please select a cryptogram letter first.");
    }
}

// Clear all highlights after guess or clear
function clearHighlights() {
    let allLetters = document.querySelectorAll('.cryptogram-container .guess');
    allLetters.forEach(guess => {
        guess.classList.remove('highlight');
    });
}

// Clear guess for the selected letter
function clearGuess() {
    if (selectedLetter) {
        let allLetters = document.querySelectorAll('.cryptogram-container .guess');
        allLetters.forEach(guess => {
            if (guess.getAttribute('data-letter') === selectedLetter) {
                guess.textContent = '_';  // Reset to placeholder
            }
        });
        selectedLetter = null; // Reset after clearing
        clearHighlights();
    } else {
        alert("Please select a cryptogram letter first.");
    }
}

// Keyboard input handler
function handleKeyboardInput(e) {
    const guessedLetter = e.target.textContent;
    replaceLetter(guessedLetter);
}

// Generate the cipher and encode the phrase
generateCipher();
const encodedPhrase = encodePhrase(secretPhrase);

// Display the encoded cryptogram
initializeCryptogram(encodedPhrase);

// Add event listeners to keyboard buttons
document.querySelectorAll('.keyboard button').forEach(button => {
    button.addEventListener('click', handleKeyboardInput);
});

// Add event listener for the "Clear Guess" button
document.getElementById('clear-guess').addEventListener('click', clearGuess);

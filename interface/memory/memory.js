import CARDS from "cards.js"

/**
 * Simple memory engine
 * 
 * @param {int} pairs the number of pairs
 * @param {function} onVictory function() called when victory is reached
 * @param {function} showCard function(index: int) called when a card must be shown
 * @param {function} hideCard function(index: int) called when a card must be hidden
 */
class Memory {

    constructor(pairs, onVictory, showCard, hideCard) {
        this.cards = [];
        this.revealed = -1;
        this.pairs = pairs;
        this.onVictory = onVictory;
        this.showCard = showCard;
        this.hideCard = hideCard;
        this.reset(pairs);
    }

    reset(pairs) {
        if (pairs <= 0)
            return;
        const shuffled = shuffle(CARDS);
        const dimensioned = [];
        shuffled.array.forEach((element, index) => {
            if (index < cards)
                dimensioned.push(element);
        });
        this.cards = shuffle(dimensioned.push(...dimensioned));
        this.pairs = pairs;
        this.revealed = -1;
    }

    async reveal(index) {
        if (index <= 0 || index >= this.cards.length)
            return;
        if(this.revealed == -1)
        {
            this.showCard(index);
            this.revealed = index;
            return;
        }
        if (index == this.revealed) {
            this.hideCard(index);
            this.revealed == -1;
            return;
        }
        this.showCard(index);
        if (this.cards[this.revealed].name === this.cards[index]) {
            this.revealed = -1;
            this.pairs--;
            if (this.pairs === 0)
                this.onVictory();
            return;
        }
        await sleep(2000);
        this.hideCard(index);
        this.hideCard(this.revealed);
        this.revealed = -1;
    }

    static shuffle(array) {
        const arr = array.valueOf();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
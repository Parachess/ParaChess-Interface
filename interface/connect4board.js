const dictCouleurs = { 'r': 'rouge', 'b': 'bleu' };
const dictCouleursEmojis = { 'r': '🔴', 'b': '🔵' };

let positionsIndex = 0;
let positions = [Array(6).fill(null).map(() => Array(7).fill(null))];
let color = 'blue';
let legalColumns = [1, 2, 3, 4, 5, 6, 7];

function getBaliseCaseLibre(colonneChoisie, ligneChoisie) {
    return document.getElementById('ligne_' + ligneChoisie + '_col_' + colonneChoisie);
}

function createButtonGrid() {
    /*
    Fonction créant la grille de boutons pour choisir la colonne où déposer son jeton
    */
    document.getElementById("buttons-table")?.remove();
    const tab = document.createElement('table');
    tab.id = "board-table";
    const divButtons = document.getElementById("div-button");
    tab.id = "buttons-table";
    divButtons.appendChild(tab);
    const tbody = document.createElement('tbody');
    tab.appendChild(tbody);
    const tr = document.createElement('tr');
    tbody.appendChild(tr);
    for (let i = 1; i < 8; i++) {
        const td = document.createElement('td');
        td.id = "case_" + i
        const btn = document.createElement('button');
        btn.innerText = String(i);
        btn.id = "btn_" + i;
        if (!legalColumns.includes(i)) {
            btn.classList.add("illegal");
            btn.disabled = true;
        }
        td.appendChild(btn);
        tr.appendChild(td);
    }
}

function createBoardGrid() {
    /*
    Fonction créant la grille de jeu
    */
    document.getElementById("connect4-table")?.remove();
    const tab = document.createElement('table');
    const divTab = document.getElementById("div-tab");
    tab.id = "connect4-table";
    divTab.appendChild(tab);
    const tbody = document.createElement('tbody');
    tab.appendChild(tbody);
    for (let i = 1; i < 7; i++) {
        const tr = document.createElement('tr');
        tr.id = "ligne_" + i;
        tbody.appendChild(tr);
        for (let j = 1; j < 8; j++) {
            let td = document.createElement('td');
            td.id = 'ligne_' + i + '_col_' + j;
            if (positions[positionsIndex][i - 1][j - 1] === 'r') td.style.backgroundColor = 'red';
            else if (positions[positionsIndex][i - 1][j - 1] === 'b') td.style.backgroundColor = 'blue';
            else  {
                td.onclick = (_) => pushPawn(j);
                td.style.cursor = 'pointer';
            }
            tr.appendChild(td);
        }
    }
}

function getFirstLineNumber(partieEnCours, colonneChoisie) {
    /*
    Fonction permettant de savoir quelle est la première case de libre en fonction d'une colonne donné
    */
    let colonne = colonneChoisie - 1;
    for (let i = 5; i >= 0; i--) {
        if (partieEnCours[i][colonne] === null) {
            let ligneGrille = i + 1;
            return ligneGrille
        }
    }
    return -1
}

window.addEventListener('keydown', e => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const actuelBoutonFocus = document.activeElement;
        if (e.key === "ArrowLeft") {
            const nouveauBoutonFocus = document.getElementById("btn_" + (parseInt(actuelBoutonFocus.innerText) - 1));
            if (nouveauBoutonFocus) nouveauBoutonFocus.focus();
        }
        else if (e.key === "ArrowRight") {
            const nouveauBoutonFocus = document.getElementById("btn_" + (parseInt(actuelBoutonFocus.innerText) + 1));
            if (nouveauBoutonFocus) nouveauBoutonFocus.focus();
        }
    }
});

function displaySideColor(couleur) {
    annonceCouleur = document.getElementById("side");
    annonceCouleur.innerText = "Tour au " + dictCouleurs[couleur] + ' ' + dictCouleursEmojis[couleur] + ".";
}

const zoneBoutons = document.getElementById('div-button');
zoneBoutons.addEventListener('click', e => {
    let elementClique = e.target;

    if (elementClique.tagName !== 'BUTTON') return;

    let colonneChoisie = parseInt(elementClique.textContent, 10);
    pushPawn(colonneChoisie);
    displaySideColor(color);
});

function pushPawn(column) {
    let ligneChoisie = getFirstLineNumber(positions[positionsIndex], column);
    if (ligneChoisie !== -1) {
        const columnIndex = column - 1;
        const ligneListe = ligneChoisie - 1;
        positions.push(positions[positionsIndex]);
        positions[positionsIndex++][ligneListe][columnIndex] = color; 
        const baliseCaseLibre = getBaliseCaseLibre(column, ligneChoisie);
        baliseCaseLibre.style.backgroundColor = color;
        color = color === 'b' ? 'r' : 'b';
        displaySideColor(color);
    }
    sendMove(column);
}

async function showState(text) {
    document.getElementById('state-popup-title').textContent = text;
    document.getElementById('state-popup').classList.add('visible');
}

/**
 * go to the menu of game selection
 */
function goToMenu() {
    window.open('/jeux?g=disconnect4', '_self');
}

createButtonGrid();
createBoardGrid();
const search = new URLSearchParams(window.location.search);
if (search.has('g') && document.getElementById('game-id-span')) {
    document.getElementById('game-id-span').textContent = search.get('g');
}
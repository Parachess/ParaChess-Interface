/**
 * This file contains the Game class.
 * A Game object has a name, a list of teams and of players, an initial side,
 * a variable that allows to check if the game is over, the reason for which a game
 * is over and a list of winning sides. A Game objects must also provide
 * a list of positions (or situations) that occurred during the game and a history of actions.
 * It has various methods to deal with users and teams. Also it provides a method to check whether
 * it is possible to undo an action. Finally the game contains the last time it was played.
 * 
 * @author ParaGames
 */
export default class Game {

    /**
     * Constructor
     * 
     * @param {string} name the name of the game
     * @param {Array[string]} teams the list of supported teams for the game
     * @param {string} side the first player
     * @param {Object} players a dictionary of players
     */
    constructor(name, teams, side, players = {}) {
        this.name = name;
        this.teams = teams;
        this.side = teams.includes(side) ? side : teams[0] ?? null;
        this.players = players;
        this.gameOver = false;
        this.reasonOfGameOver = null;
        this.winningSides = [];
        this.positions = [];
        this.history = [];
        this.lastActionTime = Date.now();
    }

    /**
     * Checks wether it is possible to make the game go back to the previous
     * positions. The user must own the game in order to undo a move.
     * 
     * @param {string} player the player id
     * @returns {string} 'true' if the game can go back to a previous position
     */
    mayUndo(player) {
        if (this.isPlayer(player) && this.getTeamsOfPlayer(player).length >= this.teams.length && this.history.length > 0 && !this.gameOver) return true;
    }

    /**
     * Gives the next team from one side 
     * 
     * @param {string} initialSide the initial team (by default it's the 'side' property) 
     * @returns {string} the next team
     */
    getNextTeam(side=this.side) {
        let i = -1;
        for (let j = 0; j < this.teams.length - 1; j++) {
            if (this.teams[j] === side) {
                i = j;
                break;
            }
        }
        return i === -1 ? this.teams[0] : this.teams[i + 1];
    }

    /**
     * Gives the previous team from one side 
     * 
     * @param {string} initialSide the initial team (by default it's the 'side' property) 
     * @returns {string} the previous team
     */
    getPreviousTeam(side = this.side) {
        let i = -1;
        for (let j = 1; j < this.teams.length; j++) {
            if (this.teams[j] === side) {
                i = j;
                break;
            }
        }
        return i === -1 ? this.teams[this.teams.length - 1] : this.teams[i - 1];
    }

    /**
     * Returns the teams that have players
     * 
     * @returns {Array[string]} the teams that have players
     */
    getAssignedTeams() {
        const assigned = [];
        Object.keys(this.players).forEach(player => {
            this.getTeamsOfPlayer(player).forEach(team => {
                if (!assigned.includes(team))
                    assigned.push(team);
            })
        });
        return assigned;
    }

    /**
     * Returns the teams that doesn't have any player
     * 
     * @returns {Array[string]} the list of unassigned teams
     */
    getUnassignedTeams() {
        const assigned = this.getAssignedTeams();
        const unassigned = [];
        this.teams.forEach(team => {
            if (!assigned.includes(team))
                unassigned.push(team);
        });
        return unassigned;
    }

    /**
     * Checks if an id is registered as a player
     * 
     * @param {string} id the supposed player
     * @returns {boolean} 'true' if the id corresponds to a player
     */
    isPlayer(id) {
        return this.players[id] !== undefined && this.players[id] !== null && this.players[id].length > 0;
    }

    /**
     * Attempts to add a player. If the player is already in the game but asks for
     * more teams, he will be given in total the number of teams he asks for
     * (or the maximum of teams).
     * 
     * @param {string} id the id of the player
     * @param {int} teams the number of teams the player wants to play for
     * @returns {int} the number of roles the player may have
     */
    addPlayer(id, teams) {
        const numberOfSidesOccupied = this.getTeamsOfPlayer(id).length;
        if (numberOfSidesOccupied >= teams)
            return numberOfSidesOccupied;
        const unassigned = this.getUnassignedTeams();
        const rolesToBeAdded = teams - numberOfSidesOccupied;
        const maximumRolesToGive = rolesToBeAdded > unassigned.length ? unassigned.length : rolesToBeAdded;
        let given = 0;
        if (!this.isPlayer(id))
            this.players[id] = [];
        for (let i = 0; i < maximumRolesToGive; i++) {
            this.players[id].push(unassigned[i]);
            given++;
        }
        return given;
    }

    /**
     * Checks whether a game is playable (if unassigned teams exists)
     * 
     * @return {boolean} 'true' if players can still join the game
     */
    isPlayable() {
        return this.getUnassignedTeams().length > 0;
    }

    /**
     * get a list of players and their roles :
     * [ {player : str, teams : array[str]}]
     * 
     * @return {Array[Object]} the list of players
     */
    getPlayers() {
        const players = [];
        Object.keys(this.players).forEach(player =>{
            players.push({'player' : player, 'teams' : this.getTeamsOfPlayer(player)});
        });
        return players;
    }

    /**
     * Returns the list of the teams assigned to a player
     * 
     * @param {string} id the id of a player
     * @return {Array[string]} the list of teams owned by player
     */
    getTeamsOfPlayer(id) {
        return Object.keys(this.players).includes(id) ? this.players[id] : [];
    }

    /**
     * Returns a 'players' object with every role changed
     * 
     * @returns {Object} a dictionary
     */
    getSwappedTeams() {
        let swappedTeams = {};
        Object.keys(this.players).forEach(id => {
            const teams = this.getTeamsOfPlayer(id);
            const newTeams = [];
            teams.forEach(team => {
                newTeams.push(this.getNextTeam(team));
            });
            swappedTeams[id] = newTeams;
        });
        return swappedTeams;
    }

    /** 
     * Checks if a player owns all the teams
     * 
     * @param {string} id the id of a player
     * @return {boolean} 'true' if the player own all the teams, 'false' otherwise
     */
    isAdmin(id) {
        return this.getTeamsOfPlayer(id).length >= this.teams.length;
    }

    /**
     * returns the complete list of past and current positions
     * 
     * @return {Array[Object]} the list of positions
     */
    getPositions() {
        return this.positions;
    }

    /**
     * update the last action time of the game
     */
    update() {
        this.lastActionTime = Date.now();
    }
}
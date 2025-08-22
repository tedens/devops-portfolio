// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ChipsToken.sol";

contract BlackjackGame {
    ChipsToken public token;

    enum Result { None, Win, Lose, Blackjack, Push }
    enum Status { NotStarted, InProgress, Complete }
    enum ActionType { Hit, Stand, Double, Split, Insurance }

    struct Game {
        uint256 bet;
        uint8[] userCards;
        uint8[] dealerCards;
        bool dealerRevealed;
        Status status;
        Result result;
        bool hasDoubled;
        bool tookInsurance;
    }

    event GameStarted(address indexed player, uint256 bet);
    event CardDrawn(address indexed player, uint8 card, ActionType action);
    event InsuranceTaken(address indexed player, uint256 cost);
    event GameFinished(address indexed player, Result result, uint8 dealerTotal, uint8 playerTotal);

    mapping(address => Game) public games;
    uint256 public minBet = 10 * 1e18;
    uint256 public maxBet = 1000 * 1e18;

    constructor(address _token) {
        token = ChipsToken(_token);
    }

    modifier gameInProgress() {
        require(games[msg.sender].status == Status.InProgress, "No game in progress");
        _;
    }

    function startGame(uint256 bet) external {
        require(games[msg.sender].status != Status.InProgress, "Finish your current game");
        require(bet >= minBet && bet <= maxBet, "Bet out of range");
        require(token.transferFrom(msg.sender, address(this), bet), "Transfer failed");

        uint8 u1 = _randCard(1);
        uint8 u2 = _randCard(2);
        uint8 d1 = _randCard(3);
        uint8 d2 = _randCard(4);

        games[msg.sender] = Game({
            bet: bet,
            userCards: new uint8[](0),
            dealerCards: new uint8[](0),
            dealerRevealed: false,
            status: Status.InProgress,
            result: Result.None,
            hasDoubled: false,
            tookInsurance: false
        });

        games[msg.sender].userCards.push(u1);
        games[msg.sender].userCards.push(u2);
        games[msg.sender].dealerCards.push(d1);
        games[msg.sender].dealerCards.push(d2);

        emit GameStarted(msg.sender, bet);

        if (_handTotal(games[msg.sender].userCards) == 21) {
            uint256 payout = (bet * 25) / 10;
            token.transfer(msg.sender, payout);
            games[msg.sender].status = Status.Complete;
            games[msg.sender].result = Result.Blackjack;
            emit GameFinished(msg.sender, Result.Blackjack, _handTotal(games[msg.sender].dealerCards), 21);
        }
    }

    function hit() external gameInProgress {
        Game storage g = games[msg.sender];
        uint8 card = _randCard(block.number);
        g.userCards.push(card);
        emit CardDrawn(msg.sender, card, ActionType.Hit);

        if (_handTotal(g.userCards) > 21) {
            g.status = Status.Complete;
            g.result = Result.Lose;
            emit GameFinished(msg.sender, Result.Lose, _handTotal(g.dealerCards), _handTotal(g.userCards));
        }
    }

    function doubleDown() external gameInProgress {
        Game storage g = games[msg.sender];
        require(!g.hasDoubled, "Already doubled");
        require(token.transferFrom(msg.sender, address(this), g.bet), "Double transfer failed");

        g.bet *= 2;
        g.hasDoubled = true;
        uint8 card = _randCard(block.number);
        g.userCards.push(card);
        emit CardDrawn(msg.sender, card, ActionType.Double);

        stand();
    }

    function takeInsurance() external gameInProgress {
        Game storage g = games[msg.sender];
        require(!g.tookInsurance, "Already took insurance");
        uint256 cost = g.bet / 2;
        require(token.transferFrom(msg.sender, address(this), cost), "Insurance transfer failed");

        g.tookInsurance = true;
        emit InsuranceTaken(msg.sender, cost);
    }

    function stand() public gameInProgress {
        Game storage g = games[msg.sender];
        g.dealerRevealed = true;

        uint8 dealerScore = _handTotal(g.dealerCards);
        while (dealerScore < 17) {
            uint8 newCard = _randCard(block.number);
            g.dealerCards.push(newCard);
            dealerScore = _handTotal(g.dealerCards);
        }

        uint8 userScore = _handTotal(g.userCards);
        g.status = Status.Complete;

        if (dealerScore > 21 || userScore > dealerScore) {
            token.transfer(msg.sender, g.bet * 2);
            g.result = Result.Win;
        } else if (userScore == dealerScore) {
            token.transfer(msg.sender, g.bet);
            g.result = Result.Push;
        } else {
            g.result = Result.Lose;
        }

        emit GameFinished(msg.sender, g.result, dealerScore, userScore);
    }

    function getGame() external view returns (
        uint256 bet,
        uint8[] memory userCards,
        uint8 dealerCardShown,
        bool dealerRevealed,
        Status status,
        Result result
    ) {
        Game storage g = games[msg.sender];
        dealerCardShown = g.dealerRevealed ? g.dealerCards[1] : 0;
        return (
            g.bet,
            g.userCards,
            dealerCardShown,
            g.dealerRevealed,
            g.status,
            g.result
        );
    }

    function _randCard(uint256 salt) internal view returns (uint8) {
        return uint8((uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, salt, block.prevrandao))) % 11) + 1);
    }

    function _handTotal(uint8[] memory cards) internal pure returns (uint8 total) {
        uint8 aces = 0;
        for (uint i = 0; i < cards.length; i++) {
            total += cards[i];
            if (cards[i] == 1) aces++;
        }
        while (total <= 11 && aces > 0) {
            total += 10; // count ace as 11 instead of 1
            aces--;
        }
    }
}
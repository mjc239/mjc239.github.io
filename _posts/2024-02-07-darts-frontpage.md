---
title: "The Quadro board - why did it flop?"
excerpt: "Using statistics to investigate darts strategies - the introduction"
header:
    image: assets/images/darts_frontpage.jpg
    teaser: assets/images/darts_frontpage.jpg
toc: false
published: true
classes: wide
tags:
 - darts
---

The year of 1993 was one of the most eventful and consequential years in the history of the sport of darts. This was the year of the "split in darts"[^1], when 16 of the best players in the world (including household names such as Jocky Wilson, Eric Bristow and Phil Taylor) formed the WDC (i.e. the World Darts Council), an organisation to compete against the existing governing body, the British Darts Organisation (BDO). This was in response to complaints the players had about the BDO's rule; it had presided over the ongoing decline in the popularity of the sport over the 1980s and 90s, as well as exhibiting dictatorial behaviour in the treatment of players. Shortly after the split, players in the WDC were banned from participating in any BDO tournaments, at any level.

The new sporting body started to organise its own tournaments, accessible only to members of the WDC. In order to attract fans over to the new tournaments, new innovations in the game were considered. One of these was the introduction of the Quadro board, first used professionally in the 1993 WDC UK Matchplay tournament.

The Quadro board was first manufactured by Harrows in 1992, and joins an eclectic family of variants to the familiar dart board. Traditional boards have segments representing the numbers 1 to 20, arranged around the central bullseye (itself split into two concentric circles), in a specific order with 20 at the top. Each segment is surrounded by a double ring, which doubles the value of the segment when hit, and contains a triple ring which multiplies the segment score by 3.

| ![Conventional dartboard (yawn)](/assets/images/dartboard.png) |
|:--:|
| The conventional dartboard, with the main scoring areas highlighted | 

The new Quadro board attempted to liven up the game by adding an additional ring, between the triple ring and the bullseye, which would quadruple the segment score when hit:

| ![Quadro dartboard (:O)](/assets/images/quadro.png) |
|:--:|
| The Quadro dartboard, with the additional quadruple ring inside the triple ring | 

Whereas the highest score with 3 darts in a normal game could score a maximum of 180 (three triple-20s), the maximum score on the new board with 3 darts would now be 240 (three quadruple-20s). In fact, several of the players at the tournament managed to achieve this impressive score during play. Here is a clip of a match between Jocky Wilson and Phil Taylor, including such an occurrence:

{% include video id="oom6lF-hGHU" provider="youtube" %}

What an exciting way to liven up the game - higher scores, harder to hit maximums, more variety in strategy... what's not to like? Well, the players turned out not to appreciate the additional burden of all the additional checkout combinations that were possible with the new board. It was used for the next few WDC UK Matchplay tournaments, up until the year 1996, after which it was retired from use in professional tournaments. The manufacturer stopped producing the boards by 2000[^2]. You can still find the boards occasionally on eBay, where they typically sell for a few hundred pounds to collectors of historical darts memorabilia.

But how well founded are complaints about the Quadro board? For example, how does optimal strategy on a Quadro board compare to the strategy for a conventional darts board?

### Analysing the boards

There are several degrees of depth for which this problem can be analysed:

- For a particular board, where should I aim in order to maximise my score with one dart? How does this depend on my ability as a darts player?


- If I start with a particular score (e.g. 501, the normal starting score for a professional leg), where should I aim in order to checkout (including finishing with a mandatory double or bullseye) within the minimum possible throws? How does my ability affect this strategy?


- Starting with the same setup, but this time throwing in turns of 3 darts - where should I aim in order to minimise the number of turns needed to checkout?


- Introduce a second player, who also starts with the same score. Taking it in turns to throw 3 darts at a time, what strategy should I use to maximise my chance of checking out first? How will this depend on my ability, my opponents ability, and my opponents score?

There have been a number of interesting papers and analyses produced which aim to answer these questions for the standard dartboard:
- [A Statistician Plays Darts](https://www.stat.cmu.edu/~ryantibs/papers/darts.pdf), by Tibshirani, Price & Taylor - not the earliest attempt to analyse the game from a statistical perspective, but the first to come to my attention and spark my interest in the topic. The authors model the throwing distribution of a player as a generic 2D Gaussian distribution, which can be used to identify the optimal place to aim to maximise score with a single dart. They also develop a method using the EM algorithm to allow a player to approximate their throwing distribution, just from the scores achieved when aiming at the bullseye over repeated throws.


- [Optimising darts strategy using Markov decision processes and reinforcement learning](https://www.tandfonline.com/doi/abs/10.1080/01605682.2019.1610341), by Graham Baird - this paper used a Markov Decision Process (MDP) to model a player attempting to check out in the least number of turns of three darts. The 'states' of the MDP are current scores, along with the number of remaining darts to throw in the turn, and the potential fallback score if the player goes bust. The 'actions' are positions on the board at which the player can aim, with an associated probability distribution over scoring areas depending on the skill level of the player. The 'reward' (or punishment in this case) is given by the number of turns taken to check out. The paper identifies an optimal policy (stategy) for a given throwing distribution, and investigates the resulting behaviour, identifying a number of interesting strategies which are recognisable from the real game.


- [Play Like the Pros? Solving the Game of Darts as a
Dynamic Zero-Sum Game](https://arxiv.org/pdf/2011.11031.pdf), by Haugh & Wang - An extension to the paper by Baird, to a 2-player ZSG (zero-sum game) where the behaviour of a player depends not just on the player's current score, but also on their opponent's score. They are also able to compare strategies of real professional players from the 2019 season.

Of course, all of these papers focus on the standard dart board with only double and triple rings. Over the next few posts, I want to recreate the results of some of these papers, explore the strategies that are identified, and see what they have to say about the Quadro board. With the resurgence of the popularity of professional darts in recent years, amplified by the stunning rise of 16-year old [Luke Littler](https://en.wikipedia.org/wiki/Luke_Littler) at the 2024 PDC World Darts Championship, maybe there is a case to be made that the Quadro board deserves to be brought back?

### Posts in the series:
- [How do I throw high scoring darts?](https://mjc239.github.io/maximising-single-dart/)

[^1]: [Split in darts](https://en.wikipedia.org/wiki/Split_in_darts) Wikipedia page
[^2]: [History of the Quadro board](https://patrickchaplin.com/2019/10/07/the-quadro-240/)

---
title: A Data Scientist Plays Darts
layout: archive
permalink: /darts/
classes: wide
---

A collection of posts, using a statistical approach to analyse the game of darts - in particular, looking at:
- The best ways to maximise score and come up with winning strategies
- Analysing the Quadro board, a variant of the standard board used briefly in the 90s
- Constructing tools to help players optimise their game.

![Heatmaps for various sigmas](/assets/images/2024-02-18-dartboard-heatmaps.png)

## Posts

<div class="entries-grid">
  {% assign darts_posts = site.tags.darts | reverse %}
  {% for post in darts_posts %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>

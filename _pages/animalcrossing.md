---
title: Animal Crossing Stalk Market
layout: archive
permalink: /animalcrossing/
classes: wide
---

Analysing the Animal Crossing Stalk Market, to work out when it is best to buy turnips from Daisy Mae.

![Daisy Mae](/assets/images/daisymae.jpeg)

## Posts

<div class="entries-grid">
  {% assign ac_posts = site.tags['animal-crossing'] | reverse %}
  {% for post in ac_posts %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>

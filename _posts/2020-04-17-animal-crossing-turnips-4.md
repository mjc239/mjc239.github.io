---
title: "Animal Crossing Turnip Market -- When to sell?"
excerpt: "Post 4 - The Oracle and perfect play"
header:
    image: assets/images/turniproom.jpeg
toc: true
published: false
toc_label: "Contents:"
classes: wide
author_profile: false
sidebar:
  - text: |
        <div class="author__avatar">
        <img src="/assets/images/my_face.jpg" alt="Michael Cole" itemprop="image">
        </div>
        <h3 class="author__name" itemprop="name">Michael Cole</h3>
        <div class="author__urls-wrapper">
        <button class="btn btn--inverse">Follow</button>
        <ul class="author__urls social-icons">
        <li itemprop="homeLocation" itemscope="" itemtype="https://schema.org/Place">
        <i class="fas fa-fw fa-map-marker-alt" aria-hidden="true"></i> <span itemprop="name">London, UK</span>
        </li>
        <li><a href="https://github.com/mjc239" rel="nofollow noopener noreferrer">
        <i class="fab fa-fw fa-github" aria-hidden="true"></i><span class="label">GitHub</span>
        </a>
        </li>
        <li>
        <a href="https://twitter.com/mikeyjcole" rel="nofollow noopener noreferrer">
        <i class="fab fa-fw fa-twitter-square" aria-hidden="true"></i><span class="label">Twitter</span>
        </a>
        </li>
        <li><a href="https://www.linkedin.com/in/michaeljcole1/" rel="nofollow noopener noreferrer">
        <i class="fab fa-fw fa-linkedin" aria-hidden="true"></i><span class="label">LinkedIn</span>
        </a>
        </li>
        </ul>
        </div>
  - text: |
        <div class="author__avatar">
        <img src="/assets/images/bartley.jpg" alt="Jack Bartley" itemprop="image">
        </div>
        <h3 class="author__name" itemprop="name">Jack Bartley</h3>
        <div class="author__urls-wrapper">
        <button class="btn btn--inverse">Follow</button>
        <ul class="author__urls social-icons">
        <li itemprop="homeLocation" itemscope="" itemtype="https://schema.org/Place">
        <i class="fas fa-fw fa-map-marker-alt" aria-hidden="true"></i> <span itemprop="name">London, UK</span>
        </li>
        <li>
        <a href="http://jackbartley.com/" rel="nofollow noopener noreferrer">
        <i class="fas fa-fw fa-chalkboard-teacher" aria-hidden="true" style="color: #d34737"></i><span class="label">Teaching</span>
        </a>
        </li>
        <li>
        <a href="https://twitter.com/dr_bartley" rel="nofollow noopener noreferrer">
        <i class="fab fa-fw fa-twitter-square" aria-hidden="true"></i><span class="label">Twitter</span>
        </a>
        </li>
        </ul>
        </div>
tags:
 - probability
---

{% include mathjax.html %}

This post is written in collaboration with [Jack Bartley](http://jackbartley.com/), while playing [Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

# Post 4: "Turnip" Townshend<sup>[2](#myfootnote2)</sup> The Oracle

## The Oracle and perfect play

Even with perfect information of the prices to come, there is evidently only so well you could do. Indeed, the optimal strategy in the event of perfect information is simply to sell for the maximum price. The performance of this "strategy" provides a natural benchmark for the performance of others. Let's quickly work out how well this Oracle would do in expectation in the case of uniform and exponential quotes.

### A simple expression for the expectation of the maximum (for non-negative quotes)

Given $X\_{1}, \ldots, X\_{n}$ iid, we write $X\_{(1)}, \ldots, X\_{(n)}$ for the [order statistics](https://en.wikipedia.org/wiki/Order_statistic), noting that $X\_{(n)} = \max\_i X\_{i}$. Now since

$$
\begin{align}
F_{X_{(n)}}(x) &= P(X_{(n)}\leq x)\\
&= P(X_{1}, \ldots, X_{n}\leq x)\\
&= F_X(x)^n\\
\end{align}
$$

using the well known expression for the expectation of a nonnegative random variable gives

$$
E(X_{(n)}) = \int_0^\infty 1 - F_{X}(x)^n dx.
$$

### The Oracle: uniform quotes

Suppose $X\_{1}, \ldots, X\_{n}\sim\text{U}[0, 1]$ are iid. Then

$$
\begin{align}
E(X_{(n)}) &= \int_0^1 1 - x^n dx \\
&= 1 - \frac{1}{n + 1}.
\end{align}
$$

It is interesting to compare this to the estimates were obtained earlier on the expected return of our strategy

$$
s_{0} = 1 - \frac{2}{n + O(\log{n})}.
$$

### The Oracle: exponential quotes

Suppose $X\_{1}, \ldots, X\_{n}\sim\text{Exp}(\lambda)$ are iid. Then

$$
E(X_{(n)}) = \int_0^\infty 1 - (1 - e^{ - \lambda x})^n dx.
$$

Substituting $u = 1 - e^{ - \lambda x}$ gives

$$
\begin{align}
E(X_{(n)}) &= \lambda^{ - 1}\int_0^1 \frac{1 - u^n}{1 - u} dx \\
&= \lambda^{ - 1}\int_0^1 \sum_{i = 0}^{n - 1}u^i dx \\
&= \lambda^{ - 1}\sum_{i = 1}^n \frac{1}{i}.
\end{align}
$$

In other words, we have 

$$
E(X_{(n)}) = \lambda^{ - 1}\log{n} + O(1)
$$

(see for example the Wikipedia entry for the [Euler-Mascheroni](https://en.wikipedia.org/wiki/Euler%E2%80%93Mascheroni_constant) though of course this is rather more than we need here).

### Numerical example: the Beta distribution

Once again, we obtain a first order recurrence relation for the threshold values, which can be solved
using a generalised version of the python function used earlier:

```python
def strat_thresholds_arb(n, f, F):
    """Strategy thresholds for an arbitrary distribution
    
    Computes the threshold values of the optimal strategy, 
    when prices are drawn from an arbitrary continuous 
    distribution. The only restriction on the distribution 
    is that the prices are assumed to be positive, so 
    P(price < 0) = 0.

    Args:
        n (int): Number of days over which prices are offered.
        f (function): The pdf of the price distribution.
        F (function): The cdf of the price distribution.

    Returns:
        s (numpy.ndarray): vector of optimal strategy values.
    """
    exp_f = scipy.integrate.quad(lambda x: x*f(x), 
                                 -np.inf, 
                                 np.inf)[0]
    s = np.zeros(n)
    
    for i in range(n-1):
        s[i+1] = s[i]*F(s[i]) \
                    + exp_f \
                    - scipy.integrate.quad(lambda x: x*f(x), 
                                           0, 
                                           s[i])[0]
    
    s = s[::-1]

    return s
```

This allows the optimal threshold values to be computed, given the pdf and cdf of the
chosen price distribution. For example, consider the 
[beta distribution](https://en.wikipedia.org/wiki/Beta_distribution) on the interval
$[0, 1]$, with parameters $\alpha=\beta=2$. 

| ![Beta distribution pdf](/assets/images/beta_dist.png) |
|:--:|
| *The probability density function of the Beta distribution with $\alpha=\beta=2$, with support on the finite interval $[0, 1]$.* |

```python
a = 2
b = 2
from scipy.stats import beta
f = lambda x: beta.pdf(x, a, b)
F = lambda x: beta.cdf(x, a, b)

thresholds_and_exp = strat_thresholds_arb(7, f, F)
expectation = thresholds_and_exp[0]
thresholds = thresholds_and_exp[1:]

print(f'Thresholds are: ')
for day, threshold in enumerate(thresholds):
    print(f'Day {day+1}: {threshold}')
print(f'giving an expected sold price of {expectation}')
```
    Thresholds are: 
    Day 1: 0.7100732691913013
    Day 2: 0.6833505390608796
    Day 3: 0.6471781730651854
    Day 4: 0.5937499999999999
    Day 5: 0.4999999999999999
    Day 6: 0.0
    giving an expected sold price of 0.7309109556148288
    
As mentioned earlier, the expected value of the strategy over 6 days is computed by
finding the optimal threshold for the 7th day.


<a name="myfootnote2">2</a>: [Charles Townshend, 2nd Viscount Townshend](https://en.wikipedia.org/wiki/Charles_Townshend,_2nd_Viscount_Townshend#%22Turnip%22_Townshend).

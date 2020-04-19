---
title: "Animal Crossing Turnip Market - When to sell?"
image: https://www.nintendo.com/content/dam/noa/en_US/games/switch/a/animal-crossing-new-horizons-switch/animal-crossing-new-horizons-switch-hero.jpg
tags:
  - probability
---
<script src="https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML" type="text/javascript"></script>

This post is done in collaboration with [Jack Bartley](http://jackbartley.com/), while playing 
[Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

In the game, one of the fastest ways of earning bells (the in game currency) and pay off your 
mortgage to Tom Nook is through the __Stalk Market__; essentially, this involves speculating on the 
price of turnips (chosen because the Japanese word for turnip, 蕪 (kabu) is pronounced in the same way 
as 株 (kabu), the word for stock).

So how does it work? The way in which turnips can be used to make a profit (or loss!) is as follows:
-  Every Sunday, a character called Daisy Mae can be found wandering around the island. She will offer 
to sell the player turnips at a randomly chosen (integer between 90 and 110) base price. 
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">It&#39;s Sunday, and that means it&#39;s turnip time! How much are you investing in Sow Joan&#39;s Stalk Market today? <a href="https://twitter.com/hashtag/ACNH?src=hash&amp;ref_src=twsrc%5Etfw">#ACNH</a> <a href="https://twitter.com/hashtag/AnimalCrossing?src=hash&amp;ref_src=twsrc%5Etfw">#AnimalCrossing</a> <a href="https://t.co/jlzVXSvT6V">pic.twitter.com/jlzVXSvT6V</a></p>&mdash; Nintendo of America (@NintendoAmerica) <a href="https://twitter.com/NintendoAmerica/status/1246849300958556160?ref_src=twsrc%5Etfw">April 5, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
- On every other day of the week, Timmy and Tommy in Nook's Cranny will offer to buy turnips from you. They
will offer two prices a day (one in the morning, one in the afternoon), which may be higher or lower than
the base price that the turnips were bought for from Daisy Mae.
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Look at these smug bastards. They keep lowballing me all the time with the Turnip prices. I&#39;m onto your game Timmy &amp; Tommy. The real Animal Crossing crooks right here. <a href="https://t.co/OWgTCSet7d">pic.twitter.com/OWgTCSet7d</a></p>&mdash; Scott Redmond (@ScottPRedmond) <a href="https://twitter.com/ScottPRedmond/status/1249818533791326209?ref_src=twsrc%5Etfw">April 13, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


## Uniformly distributed quotes

Let $X_{1}, ..., X_{n}\sim U[0, 1]$ be iid random variables. Suppose we have the opportunity to 
sell at $X_{i}$ at time $i$, and turnips spoil at time $n$. Let $X$ be the price the turnips are 
sold at.

Consider the following strategy:
Sell at time $i$ if $X_{i}\geq s_{i}$.

Let $$T_{i}$$ be the event that $$X_{i}\geq s_{i}$$ and $$X_{j}<s_{j}$$ for all $$j<i$$. Also, 
let $S_{i}$ be the event that $X_{i}\geq s_{i}$. We can write $T_{i}$ in terms of $S_{i}$:

$$
T_{i} = S_{i}\cap\bigcap_{j<i}S_{j}^{c}
$$

Then:

$$
\begin{align}
E(X) &= \sum_{i=1}^{n}E\left(X_{i}|T_{i}\right)P\left(T_{i}\right) \\
&= \sum_{i=1}^{n}E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)
\end{align}
$$

As $P\left(S_i\right)=1-s_{i}$ and all the $X_{i}$ are iid, we have

$$
\begin{equation}
P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) = (1-s_{i})\prod_{j<i}s_{j}
\end{equation}
$$

and

$$
\begin{align}
E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) &= E\left(X_{i}\;\middle|\;S_{i}\right) \\
&= \frac{1}{2}\left(1+s_{i}\right)
\end{align}
$$

Putting this together,

$$
E(X) = \sum_{i=1}^{n}\frac{1}{2}(1-s_{i}^{2})\prod_{j<i}s_{j}
$$

We seek to maximise this expectation with respect the strategy values $s_{i}$. 
This can be done by differentiating:

$$
\begin{align}
\frac{\partial}{\partial s_{k}}E(X) &= \frac{\partial}{\partial s_{k}}\left[\frac{1}{2}(1-s_{k}^{2})\prod_{j<k}s_{j} + \sum_{i>k}\frac{1}{2}(1-s_{i}^{2})\prod_{j<i}s_{j}\right] \\
&= \prod_{j<k}s_{j}\left[-s_{k} + \frac{1}{2}\sum_{i>k}(1-s_{i}^{2})\prod_{k<j<i}s_{j}\right]
\end{align}
$$

where in the first line the sum is split into terms with $i<k$ (which vanish when hit by the derivative), the term with $i=k$ (the first insise the square brackets), and those with $i>k$; in the second line, the terms are differentiated and $s_{j}$ factors are taken out. When the expectation is maximised, this partial derivative will be zero for each $1\leq k\leq n$. We can assume that $s_{j}\neq 0$ for all $j\neq n$ - in other words, for any non-final date, the strategy always assigns a non-zero probability to waiting for a future date. 

Letting $\tilde{s}_{i}$ be expectation-maximising values of the thresholds, 
we obtain a recurrence relation:

$$
\begin{equation}
\tilde{s}_{k} = \frac{1}{2}\sum_{i>k}(1-\tilde{s}_{i}^{2})\prod_{k<j<i}\tilde{s}_{j}
\end{equation}
$$

This is a recurrence relation allowing the calculation of $\tilde{s}\_{k}$, given the values of 
$\\{\tilde{s}\_{k+1},...,\tilde{s}\_{n}\\}$. This, along with the observation that $\tilde{s}\_{n}=0$
(as on the final day, the turnips __must__ be sold whatever the quoted price, otherwise they 
will spoil and become worthless) allows the computation of all of the optimal threshold values. 

In fact, this recurrence relation can be simplified by observing that a factor of 
$\tilde{s}_{k+1}$ can be identified:

$$
\begin{align}
\tilde{s}_{k} &= \left(\frac{1}{2}\sum_{i>k+1}(1-\tilde{s}_{i}^{2})\prod_{k+1<j<i}\tilde{s}_{j}\right)\tilde{s}_{k+1} + \frac{1}{2}(1-\tilde{s}_{k+1}^{2}) \\
&= \left(\tilde{s}_{k+1}\right)\tilde{s}_{k+1} + \frac{1}{2}(1-\tilde{s}_{k+1}^{2}) \\
&= \frac{1}{2}\left(1+\tilde{s}_{k+1}^{2}\right).
\end{align}
$$

Therefore, the recurrence relation is first order, meaning the value of each $\tilde{s}\_{i}$ can 
be computed directly from a single successive value $\tilde{s}\_{i+1}$. 

At first glance, this recurrence relation is not particular familiar; however, by performing 
the substitution $t_{k}=\frac{1}{2}(1-\tilde{s}_{n-k})$, we obtain

$$
t_{i+1} = t_{i}(1-t_{i}), \quad t_{0} = \frac{1}{2}
$$

Hopefully, this rings some bells! It should be familiar to any first year undergraduates as 
a special case of the __logistic map__, with reproductive parameter $\lambda=1$, and initial 
value $t_{0}=\frac{1}{2}$. This recurrence relation is often first encountered when 
considering the dynamics of a population of animals living in an environment with limited 
resources, and is often used as an introduction to chaos theory. In this context, it suffices 
to say that for this choice of reproductive parameter, $t_{i}$ is decreasing as $i$ increases, 
and gets arbitrarily close to $0$ for sufficiently large $i$. If there are a large number of 
days over which prices can be tracked, then over the first few days the price needs to be very 
high in order to tempt the seller!

This recurrence relation can be solved numerically using a simple python function:


```python
def compute_exp(s):
    expectation = 0
    for i in range(len(s)):
        expectation += 0.5*(1 - s[i]**2)*np.prod(s[:i])
    return expectation

def strat_thresholds(n, return_exp=False):
    s = np.zeros(n)
    
    for i in range(n-1):
        s[i+1] = 0.5*(1 + s[i]**2)
    s = s[::-1]
    
    if return_exp:
        return s, compute_exp(s)
    else:
        return s
```

For example, if prices are provided over 7 days, the threshold on the first day is about 0.8, 
decreasing to 0 on the last day when any price has to be taken:


```python
thresholds, expectation = strat_thresholds(n=7, return_exp=True)
print(f'Thresholds are: ')
for day, threshold in enumerate(thresholds):
    print(f'Day {day+1}: {threshold}')
print(f'giving an expected sold price of {expectation}')
```

    Thresholds are: 
    Day 1: 0.800375666500635
    Day 2: 0.7750815008766949
    Day 3: 0.741729736328125
    Day 4: 0.6953125
    Day 5: 0.625
    Day 6: 0.5
    Day 7: 0.0
    giving an expected sold price of 0.8203006037631679
    

It can also be seen that as the number of days increases, the expected price that the 
seller can get increases, due to the ability they have to hold out for a randomly occuring 
larger price:


```python
print('Expectation for n days:')
for day in range(1, 15):
    _, expectation = strat_thresholds(n=day, return_exp=True)
    print(f'{day} days: {expectation}')
```

    Expectation for n days:
    1 days: 0.5
    2 days: 0.625
    3 days: 0.6953125
    4 days: 0.741729736328125
    5 days: 0.7750815008766949
    6 days: 0.800375666500635
    7 days: 0.8203006037631679
    8 days: 0.8364465402671089
    9 days: 0.8498214073624082
    10 days: 0.8610982122057119
    11 days: 0.8707450655319368
    12 days: 0.8790984845741084
    13 days: 0.886407072790247
    14 days: 0.892858749346287
    
## Quotes with an arbitrary distribution

So far, we have assumed the daily quoted prices $X_{i}$ have been uniformly distributed over $[0, 1]$. 
The results derived above extend easily to the case of a uniform distribution over and arbitary 
interval $[a, b]$, by linear scaling - specifically, by letting $Y_{i} = a + (b-a)X_{i}$.

But what about more general distributions? In particular, if the distribution is known for prices $x>0$, 
what can we infer about the optimal threshold values $\tilde{s}_{i}$?

Let $f(x), x>0$ be the probability density function of the daily quotes $X_{i}$, with corresponding cumulative density function $F(x)$. The expected sold price takes the same form as given earlier:
$$
\begin{align}
E(X) &= \sum_{i=1}^{n}E\left(X_{i}|T_{i}\right)P\left(T_{i}\right) \\
&= \sum_{i=1}^{n}E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)
\end{align}
$$

However, this time we have that

$$
P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) = \left(1 - F(s_{i})\right)
$$
and
$$
\begin{align}
E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) &= E\left(X_{i}\;\middle|\;S_{i}\right) \\
&=
\end{align}
$$
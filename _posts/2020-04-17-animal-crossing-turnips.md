---
title: "Animal Crossing Turnip Market - When to sell?"
header:
    image: assets/images/turniproom.jpeg
toc: true
toc_label: "Contents:"
tags:
  - probability
---

{% include mathjax.html %}

This post is done in collaboration with [Jack Bartley](http://jackbartley.com/), while playing 
[Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

## Turnip Mania

In the game, one of the fastest ways of earning bells (the in game currency) and pay off your 
mortgage to Tom Nook is through the __Stalk Market__; essentially, this involves speculating on the 
price of turnips (chosen because the Japanese word for turnip, 蕪 (kabu) is pronounced in the same way 
as 株 (kabu), the word for stock).

So how does it work? The way in which turnips can be used to make a profit (or loss!) is as follows:
-  Every Sunday, a character called Daisy Mae can be found wandering around the island. She will offer 
to sell the player turnips at a randomly chosen (integer between 90 and 110) base price. 

![Daisy Mae](/assets/images/daisymae.jpeg){: .align-center}

- On every other day of the week, Timmy and Tommy in Nook's Cranny will offer to buy turnips from you. They
will offer two prices a day (one in the morning, one in the afternoon), which may be higher or lower than
the base price that the turnips were bought for from Daisy Mae.

![Timmy and Tommy](/assets/images/timmytommy.jpeg){: .align-center}

One of the first questions we can ask is the following: if we know the distribution of prices 
that Timmy and Tommy offer on any particular day, what is the best way to maximise the
amount you get for your turnips?

## Uniformly distributed quotes

The easiest distribution to consider is the uniform distribution - specifically, assume that
on each selling day, Timmy and Tommy offer a price that is uniformly distributed over some interval.

Let $X_{1}, ..., X_{n}\sim U[0, 1]$ be 
[iid](https://en.wikipedia.org/wiki/Independent_and_identically_distributed_random_variables) random variables, 
representing the price offered at time $i$, and suppose that the turnips spoil at time $n$. Let $X$ be the price the turnips are 
sold at.

Consider the following strategy:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$.
</p>

Put simply, on each day there is a threshold value $s_{i}$ which represents the minimum price at
which we will be prepared to sell for on that day. For example, as we need to sell the turnips before 
they spoil, we should expect to accept any price at time $t=n$; in other words, an optimal strategy 
should have $s_{n}=0$.

Let $$T_{i}$$ be the event that $$X_{i}\geq s_{i}$$ and $$X_{j}<s_{j}$$ for all $$j<i$$. Also, 
let $S_{i}$ be the event that $X_{i}\geq s_{i}$. We can write $T_{i}$ in terms of $S_{i}$:

$$
T_{i} = S_{i}\cap\bigcap_{j<i}S_{j}^{c}
$$

Then, using the law of total expectation:

$$
\begin{align}
E(X) &= \sum_{i=1}^{n}E\left(X_{i}|T_{i}\right)P\left(T_{i}\right) \\
&= \sum_{i=1}^{n}E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)
\end{align}
$$

For the uniform distribution we have $P\left(S_i\right)=1-s_{i}$, and all the quotes $X_{i}$ are iid, so we have

$$
\begin{equation}
P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) = (1-s_{i})\prod_{j<i}s_{j}
\end{equation}
$$

Also, the expected value of $X_{i}$ is independent of any other quote, so the conditional expectation simplifies:

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

where in the first line the sum is split into terms with $i<k$ (which vanish when hit by the derivative), 
the term with $i=k$ (the first inside the square brackets), and those with $i>k$; in the second line, 
the terms are differentiated and $s_{j}$ factors are taken out. When the expectation is maximised, this partial 
derivative will be zero for each $1\leq k\leq n$. We can assume that $s_{j}\neq 0$ for all $j\neq n$ - in other 
words, for any non-final date, the strategy always assigns a non-zero probability to waiting for a future date. 

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
a special case of the __logistic map__, with reproductive parameter $r=1$, and initial 
value $t_{0}=\frac{1}{2}$. This recurrence relation is often first encountered when 
considering the dynamics of a population of animals living in an environment with limited 
resources, and is often used as an introduction to chaos theory. In this context, it suffices 
to say that for this choice of reproductive parameter, $t_{i}$ is decreasing as $i$ increases, 
and gets arbitrarily close to $0$ for sufficiently large $i$. If there are a large number of 
days over which prices can be tracked, then over the first few days the price needs to be very 
high in order to tempt the seller!

<p>
<a title="Jordan Pierce / CC0" href="https://commons.wikimedia.org/wiki/File:Logistic_Bifurcation_map_High_Resolution.png">
<img width="100%" alt="Logistic Bifurcation map High Resolution" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Logistic_Bifurcation_map_High_Resolution.png/512px-Logistic_Bifurcation_map_High_Resolution.png"></a>
<em>
One of the many exciting plots you get to see when studying the logistic function, showing the convergence 
value as $i\rightarrow\infty$ for various values of $r$, the reproductive parameter
</em>
</p>

This recurrence relation can be solved numerically using a simple python function:

```python
def compute_exp(s):
    """Expected value of the strategy.
    
    Computes the expected value of the strategy, defined by
    the vector of strategy thresholds.

    Args:
        s (numpy.ndarray): Vector of threshold values.

    Returns:
        expectation (float): Expected value of the strategy
    """
    expectation = 0
    for i in range(len(s)):
        expectation += 0.5*(1 - s[i]**2)*np.prod(s[:i])
    return expectation

def strat_thresholds(n):
    """Strategy thresholds for uniformly distributed prices.
    
    Computes the threshold values of the optimal strategy, when 
    prices are drawn from an uniform distribution.

    Args:
        n (int): Number of days over which prices are offered.

    Returns:
        s (numpy.ndarray): vector of optimal strategy values.
    """
    s = np.zeros(n)
    
    for i in range(n-1):
        s[i+1] = 0.5*(1 + s[i]**2)
    s = s[::-1]
    
    return s
```

For example, if prices are provided over 6 days, the threshold on the first day is about 0.8, 
decreasing to 0 on the last day when any price has to be taken:


```python
thresholds = strat_thresholds(n=6)
expectation = compute_exp(thresholds)
print(f'Thresholds are: ')
for day, threshold in enumerate(thresholds):
    print(f'Day {day+1}: {threshold}')
print(f'giving an expected sold price of {expectation}')
```

    Thresholds are: 
    Day 1: 0.7750815008766949
    Day 2: 0.741729736328125
    Day 3: 0.6953125
    Day 4: 0.625
    Day 5: 0.5
    Day 6: 0.0
    giving an expected sold price of 0.800375666500635
    

It can also be seen that as the number of days increases, the expected price that the 
seller can get increases, due to the ability they have to hold out for a randomly occuring 
larger price:


```python
print('Expectation for n days:')
for day in range(1, 15):
    thresholds = strat_thresholds(n=day)
    print(f'{day} days: {compute_exp(thresholds)}')
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
    
An interesting thing to note here is that the expected values of the strategy 
over $n$ days are equal to the threshold values $(n+1)$ days from the end. 
There is a straightforward way to see why this is: first, recall that, by definition, 
this threshold value is the minimum selling price to accept with $n$ days remaining.
When making the decision whether to accept, you are comparing the offered price to 
the expected price you hope to receive by waiting. Therefore, the threshold value is
exactly the expected value of the strategy over the remaining $n$ days - any price less
than this can be expected to be beaten (in the probabilistic sense) in the future.

Also, we have assumed the daily quoted prices $X_{i}$ have been uniformly distributed over $[0, 1]$. 
The results derived above extend easily to the case of a uniform distribution over and arbitary 
interval $[a, b]$, by linear scaling - specifically, by letting $Y_{i} = a + (b-a)X_{i}$.

## Quotes with an arbitrary distribution

What about more general distributions? In particular, if the distribution is known for prices $x>0$, 
what can we infer about the optimal threshold values $\tilde{s}_{i}$?

Let $f(x),\, x\in [0, \infty)$ be the probability density function of the daily quotes $X_{i}$, with 
corresponding cumulative density function $F(x)$. The expected sold price takes the same form as given earlier:

$$
\begin{align}
E(X) &= \sum_{i=1}^{n}E\left(X_{i}|T_{i}\right)P\left(T_{i}\right) \\
&= \sum_{i=1}^{n}E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) \\
&= g(s_{i})
\end{align}
$$

However, this time we have that

$$
P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) = \left(1 - F(s_{i})\right)\prod_{i<j}F(s_{j})
$$

and,

$$
\begin{align}
E\left(X_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) &= E\left(X_{i}\;\middle|\;S_{i}\right) \\
&=\frac{\int_{s_{i}}^{\infty}xf(x)dx}{1-F(s_{i})}.
\end{align}
$$

Putting this together again:

$$
E(X) = \sum_{i=1}^{n}\left[\int_{s_{i}}^{\infty}xf(x)dx\right]\prod_{i<j}F(s_{j}).
$$

So we have an expression for the expected price in terms of the fixed distribution functions $f, F$ and
the threshold values $\{s_{i}\}$. To maximise the expected price, we do as we did before and find the
stationary point of the expectation. The steps follow the same logic as for the uniform case, and give a set
 of equations for the optimal threshold values $\tilde{s}_{k}$.

$$
\begin{align}
\tilde{s}_{k} &= \tilde{s}_{k+1}F(\tilde{s}_{k+1}) + \int_{\tilde{s}_{k+1}}^{\infty}xf(x)dx \\
&= \tilde{s}_{k+1}F(\tilde{s}_{k+1}) + E(X_{0}) - \int_{0}^{\tilde{s}_{k+1}}xf(x)dx
\end{align}
$$

In this formula, $X_{0}$ has pdf $f(x)$, and this step is only done to avoid the computation of repeated infinite
integrals. Once again, we obtain a first order recurrence relation for the threshold values, which can be solved
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

<p>
<img width="100%" alt="Beta Distribution pdf" src="/assets/images/beta_dist.png">
<em>
The pdf of the Beta distribution with $\alpha=\beta=2$, with support on the finite
interval $[0, 1]$.
</em>
</p>

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
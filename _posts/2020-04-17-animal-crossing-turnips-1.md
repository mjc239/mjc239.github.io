---
title: "Animal Crossing Turnip Market -- When to sell?"
header:
    image: assets/images/turniproom.jpeg
toc: true
toc_label: "Contents:"
classes: wide
tags:
 - probability
---

{% include mathjax.html %}

This post is written in collaboration with [Jack Bartley](http://jackbartley.com/), while playing [Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

# Post 1: Turnip Mania

## Turnip Mania

In the game, one of the fastest ways of earning bells (the in game currency) and pay off your mortgage to 
Tom Nook is through the __Stalk Market__; essentially, this involves speculating on the price of turnips (chosen 
because the Japanese word for turnip,  蕪 (kabu) is pronounced in the same way as 株 (kabu), the word for stock).

So how does it work? The way in which turnips can be used to make a profit (or loss) is as follows:
-  Every Sunday, a character called Daisy Mae can be found wandering around the island. She will offer to sell the 
player turnips at a randomly chosen (integer between 90 and 110) base price. 

| ![Daisy Mae](/assets/images/daisymae.jpeg) |
|:--:|
| *Daisy Mae peddling her wares* |

- On every other day of the week, Timmy and Tommy in Nook's Cranny will offer to buy turnips from you. They will 
offer two prices a day (one in the morning, one in the afternoon), which may be higher or lower than the base price 
that the turnips were bought for from Daisy Mae.

| ![Timmy and Tommy](/assets/images/timmytommy.jpeg) |
|:--:|
| *A thoroughly underwhelming offer from Timmy* |

One of the first questions we can ask is the following: if we know the distribution of prices that Timmy and Tommy 
offer on any particular day, what is the best way to maximise the amount received for the turnips? As is common we 
are interested in trying to maximise the expected profit.

## An instructive example: Uniformly distributed quotes

The easiest distribution to consider is the uniform distribution - specifically, let's assume that on each selling day, 
Timmy and Tommy offer a price that is uniformly distributed over some interval.

Let $P_{1}, ..., P_{n}\sim U[0, 1]$ be 
[iid](https://en.wikipedia.org/wiki/Independent_and_identically_distributed_random_variables) random variables, 
representing the price offered at time $i$, and suppose that the turnips spoil before another price is offered. Let 
$S$ be the price the turnips are sold at.

Consider the following strategy:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$.
</p>

Put simply, on each day there is a threshold value $s_{i}$ which represents the minimum price at which we will be 
prepared to sell for on that day. For example, as we need to sell the turnips before they spoil, we should expect to 
accept any price at time $t=n$; in other words, an optimal strategy should have $s_{n}=0$. 

Let $\tau$ be the time at which we sell, that is $\tau = \min i:P_{i}\geq s_{i}$. Then, by the law of total expectation, 
we see that for any $i$, we have

$$
E(S) = E(S|\tau < i)P(\tau < i) + E(S|\tau \geq i)P(\tau \geq i).
$$

Note that $E(S\|\tau < i)$, $P(\tau < i)$ and $P(\tau \geq i)$ depend only upon $s_{1}, \ldots, s_{i - 1}$, whereas 
$E(S\|\tau \geq i)$ depends only upon $s_{i}, \ldots, s_{n}$. Therefore, the optimal choice of $s_{i}$ depends only 
upon $s_{i + 1}, \ldots, s_{n}$. Indeed, it suffices to choose $s_{i}$ so as to maximise $E(S\|\tau \geq i)$.

Next,

$$
E(S|\tau \geq i) = E(P_i|P_i\geq s_i)P(P_i\geq s_i) + E(S|P_i < s_i)P(P_i < s_i).
$$

Now since $E(P_{i}\|P_{i}\geq s_{i}) = \frac{1}{2}(1+s_{i})$ and $P(P_i\geq s_i) = 1 - s_{i}$ we have 

$$
E(S|\tau \geq i) = \frac{1}{2}(1 - s_i^2) + s_i E(S|P_i < s_i).
$$

Clearly this is maximised when $s_i = E(S\|P_i < s_i)$. Write $\tilde{s}_i$ for this optimal threshold value. Then we 
see that

$$
\tilde{s}_i = E(S|P_i < s_i)
$$

where, as noted earlier, the right hand expression depends only upon $s_{i + 1}, \ldots, s_n$. Define $e_{n-j}$ to be 
the expected return of the strategy

<p align="center">
Sell at time $i > j$ if $P_{i}\geq s_{i}$.
</p>

That is, the expected return, were we to see all but the first $j$ prices. Moreover, writing $\tilde{e}\_{n - j}$ for 
the expected return of this strategy with the optimal thresholds, we see that $E(S\|P_{i} < s_{i}) = e_{n - i}$ and 
this gives the recurrence:

$$
\tilde{s}_i = \tilde{e}_{n - i}.
$$

This tells us that at time $n$ we should accept any price; at time $n - 1$ we should accept exactly the expected value 
of $P_n$; at time $n - 2$ we should settle for the exactly the expected value were we to pass on $P_{n - 2}$; and so on 
and so forth.

Indeed, it is possible to do one better and express the right hand side solely in terms of $\tilde{s}\_{i+1}$, and 
ultimately to find a recursive relationship between $\tilde{s}\_{i}$ and $\tilde{s}\_{i+1}$.

Again, using the total law of expectation we see that

$$
\begin{align}
\tilde{e}_{n - i} &= E(P_{i + 1}|P_{i + 1}\geq \tilde{s}_{i + 1})P(P_{i + 1}\geq \tilde{s}_{i + 1}) + E(S|P_{i + 1} < \tilde{s}_{i + 1})P(P_{i + 1} < \tilde{s}_{i + 1})\\
&= \frac{1}{2}(1 - \tilde{s}_{i + 1}^2) + \tilde{s}_{i + 1}^2\\
&= \frac{1}{2}(1 + \tilde{s}_{i + 1}^2)
\end{align}
$$

where in the second inequality we make critial use of the fact that $E(X\_{i+1}\|X\_{i+1}\geq\tilde{s}\_{i+1})=\frac{1}{2}(1+\tilde{s}\_{i + 1})$ and $E(S\|X\_{i + 1} < \tilde{s}\_{i + 1}) = \tilde{s}\_{i + 1}$.

<!--
For the uniform distribution we have $P\left(S_i\right)=1-s_{i}$, and all the quotes $P_{i}$ are iid, so we have

$$
\begin{equation}
P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) = (1-s_{i})\prod_{j<i}s_{j}
\end{equation}
$$

Also, the expected value of $P_{i}$ is independent of any other quote, so the conditional expectation simplifies:

$$
\begin{align}
E\left(P_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) &= E\left(P_{i}\;\middle|\;S_{i}\right) \\
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

<!--"Hands on" proof in uniform case goes here
-->

At first glance, this recurrence relation is not particular familiar; however, by performing 
the substitution $t\_{k}=\frac{1}{2}(1-\tilde{s}\_{n-k})$, we obtain

$$
t_{i+1} = t_{i}(1-t_{i}), \quad t_{0} = \frac{1}{2}
$$

Hopefully, this rings some bells! It should be familiar to any first year mathematics undergraduates as 
a special case of the __logistic map__, with reproductive parameter $r=1$, and initial 
value $t\_{0}=\frac{1}{2}$. This recurrence relation is often first encountered when 
considering the dynamics of a population of animals living in an environment with limited 
resources, and is usually used as an introduction to chaos theory. In this context, it suffices 
to say that for this choice of reproductive parameter, $t\_{i}$ is decreasing as $i$ increases, 
and gets arbitrarily close to $0$ for sufficiently large $i$. If there are a large number of 
days over which prices can be tracked, then over the first few days the price needs to be very 
high in order to tempt the seller.

| [![Jordan Pierce / CC0](/assets/images/logisticmap.png)](https://commons.wikimedia.org/wiki/File:Logistic_Bifurcation_map_High_Resolution.png) |
|:--:|
| *One of the many exciting plots you get to see when studying the logistic function, showing the convergence value as $i\rightarrow\infty$ for various values of $r$, the reproductive parameter.* |

### Uniformly distributed quotes: a numerical solution

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
seller can get increases, due to the ability they have to hold out for a randomly occurring 
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

## Outstanding questions

After a bit of playing around with the uniform case we've managed to find first order recurrence describing the optimal threshold values for a strategy of this sort. This begs a few natural questions.

### Seize the day!

In the above we only considered strategies of the form:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$
</p>

That is to say, the price we would settle for on each day depended only upon the day itself and not upon the prices we had seen so far. Indeed, as we tacitly assume that the buyer only has knowledge of past and not future prices, a generic strategy would be of the form:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}(P_1, \ldots, P_{i-1})$
</p>

where here $s_i$ is now a function of $i-1$ variables. Can we convince ourselves that optimal strategies must be of the former type?

### Solving the recurrence

Having found the recurrence governing the optimal thresholds, while it may not be possible to find an exact formula for them it would be nice to be able to say something more about the solutions. Perhaps we could say something about their asymptotics?

### Flying the nest

Now that we've cut our teeth on this simple case, we would like to say something about other distributions. In particular, can we find a simple recurrence governing the thresholds of an optimal strategy? Can we show that it is always the case the these optimal thresholds are the expected returns if we choose to play on, as discussed earlier?

## Next time: Non-uniform Turnips

In the [next post](post2hyperlink) we give give an answer to each of the questions posed above.

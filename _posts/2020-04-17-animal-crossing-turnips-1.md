---
title: "Animal Crossing Turnip Market -- When to sell?"
excerpt: "Post 1 - Uniformly distributed prices"
header:
    image: assets/images/turniproom.jpeg
toc: true
toc_label: "Contents:"
classes: wide
tags:
 - probability
---

{% include mathjax.html %}

This post is written in collaboration with [Jack Bartley](http://jackbartley.com/), while playing 
[Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

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
representing the price offered at time $i\in\\{1,...,n\\}$, and suppose that the turnips spoil at time $n+1$, becoming worthless 
(in the game, this is the time that Daisy Mae offers to sell you more turnips at a new price). Let $S$ be the price the 
turnips are sold to Timmy and Tommy.

### Finding an optimal strategy
Consider the following strategy:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$.
</p>

Put simply, at each time $i$ there is a threshold value $s_{i}$ which represents the minimum price at which we will be 
prepared to sell for at that time. For example, as we need to sell the turnips before they spoil, we should expect to 
accept any price at time $t=n$; in other words, an optimal strategy should have $s_{n}=0$. Under this strategy, we wish 
to compute the expected value of the selling price $S$; by carefully choosing the threshold values, we can maximise
the expected price we get for our turnips.

First, let $S_{i}$ be the event $\{P_{i}\geq s_{i}\}$, i.e. that the price at time $i$
exceeds the threshold $s_{i}$. Then, the event $T_{i}$ that the prices up to time $i$ are all less than their thresholds
 and the price at time $i$ exceeds it (in other words, we cash in our turnips at time $i$ under our strategy) can be written
 in terms of the events $S_{i}$ as

$$
T_{i} = S_{i}\cap\bigcap_{j<i}S_{j}^{c}.
$$

What is the probability of $T_{i}$, that we sell the turnips at time $i$? As each event $S_{i}$ is independent and 
$P_{i}$ is uniformly distributed, it is easy to see that

$$
\begin{equation}
\mathsf{P}\left(T_{i}\right) = (1-s_{i})\prod_{j<i}s_{j}
\end{equation}
$$

Also note that, provided the threshold at the final time $s_{n}$ is chosen to be zero (all acceptable strategies will
sell the turnips at the last time at any price), the collection $\{T_{i}\}$ comprises of a partition of the full 
probability space - at least and no more than one of the members of $\{T_{i}\}$ must occur. This allows us to apply
the law of total expectation:

$$
\begin{align}
\mathsf{E}(S) &= \sum_{i=1}^{n}\mathsf{E}(S|T_{i})\mathsf{P}(T_{i}) \\
&= \sum_{i=1}^{n}\mathsf{E}(P_{i}|T_{i})\mathsf{P}(T_{i}) \\
&= \sum_{i=1}^{n}\mathsf{E}(P_{i}|S_{i})P(T_{i}) \\
&= \sum_{i=1}^{n}\frac{1}{2}(1+s_{i})(1-s_{i})\prod_{j<i}s_{j} \\
&= \sum_{i=1}^{n}\frac{1}{2}(1-s_{i}^{2})\prod_{j<i}s_{j}
\end{align}
$$

The second line follows from the first as if $T_{i}$ is true, we have chosen to sell our turnips at time $i$, and so 
the expected selling price will be the expected value of the quoted price at that time. The third line follows by noting
that as all the $P_{i}$ are independent, the expected value of $P_{i}$ does not depend on $S_{j}$ for $j<i$. The fourth
line follows from the fact that $P_{i}$ is uniformly distributed on $[0, 1]$.

Now, note that the expected selling price $S$ is a function of the strategy we have chosen to follow, which is determined
by the daily threshold values $s_{i}$. We seek to maximise this expectation with respect to these chosen strategy
values $s_{i}$, in order to find the optimal strategy of this form. This can be done by differentiating:

$$
\begin{align}
\frac{\partial}{\partial s_{k}}\mathsf{E}(X) &= \frac{\partial}{\partial s_{k}}\left[\frac{1}{2}(1-s_{k}^{2})\prod_{j<k}s_{j} + \sum_{i>k}\frac{1}{2}(1-s_{i}^{2})\prod_{j<i}s_{j}\right] \\
&= \prod_{j<k}s_{j}\left[-s_{k} + \frac{1}{2}\sum_{i>k}(1-s_{i}^{2})\prod_{k<j<i}s_{j}\right]
\end{align}
$$

where in the first line the sum is split into terms with $i<k$ (which vanish when hit by the derivative), 
the term with $i=k$ (the first inside the square brackets), and those with $i>k$; in the second line, 
the terms are differentiated and $s_{j}$ factors are taken out. 

When the expectation is maximised, this partial 
derivative will be zero for each $1\leq k\leq n$. We can assume that $s_{j}\neq 0$ for all $j\neq n$ - in other 
words, for any non-final date, the strategy always assigns a non-zero probability to waiting until a future date.

Letting $\tilde{s}_{i}$ be expectation-maximising values of the thresholds, 
we obtain a recurrence relation:

$$
\begin{equation}
\tilde{s}_{k} = \frac{1}{2}\sum_{i>k}(1-\tilde{s}_{i}^{2})\prod_{k<j<i}\tilde{s}_{j}
\end{equation}
$$

This is a recurrence relation allowing the calculation of $\tilde{s}\_{k}$, given the values of 
$\\{\tilde{s}\_{k+1},...,\tilde{s}\_{n}\\}$. This, along with the observation that $\tilde{s}\_{n}=0$
(as at the final time, the turnips __must__ be sold whatever the quoted price, otherwise they 
will spoil and become worthless) allows the computation of all of the optimal threshold values. 

In fact, this recurrence relation can be simplified by observing that a factor of 
$\tilde{s}_{k+1}$ can be identified in the sum:

$$
\begin{align}
\tilde{s}_{k} &= \left(\frac{1}{2}\sum_{i>k+1}(1-\tilde{s}_{i}^{2})\prod_{k+1<j<i}\tilde{s}_{j}\right)\tilde{s}_{k+1} + \frac{1}{2}(1-\tilde{s}_{k+1}^{2}) \\
&= \left(\tilde{s}_{k+1}\right)\tilde{s}_{k+1} + \frac{1}{2}(1-\tilde{s}_{k+1}^{2}) \\
&= \frac{1}{2}\left(1+\tilde{s}_{k+1}^{2}\right).
\end{align}
$$

Therefore, the recurrence relation is first order, meaning the value of each $\tilde{s}\_{i}$ can 
be computed directly from a single successive value $\tilde{s}\_{i+1}$. Starting from $\tilde{s}_{n}=0$, this allows
all of the optimal thresholds to be computed in a backwards recursion.

### An alternative way of maximising $\mathsf{E}(S)$
Although our derivation above allows the thresholds to be computed exactly in a recursive fashion, the formulae do not
admit an easy interpretation. Is there another way to look at the problem, that allows the values of the optimal
thresholds to be understood in an intuitive way?

To this end, let $\tau$ be the time at which we sell, that is $\tau = \min\\{i\,|\,P_{i}\geq s_{i}\\}$. Then, by the law of total expectation, 
we see that for any $i$, we have the following expression for the expected sold price:

$$
\mathsf{E}(S) = \mathsf{E}(S\,|\,\tau < i)\,\mathsf{P}(\tau < i) + \mathsf{E}(S\,|\,\tau \geq i)\,\mathsf{P}(\tau \geq i).
$$

Note that $\mathsf{E}(S\\,|\,\tau < i)$, $\mathsf{P}(\tau < i)$ and $\mathsf{P}(\tau \geq i)$ depend only upon $s_{1}, \ldots, s_{i - 1}$, whereas 
$\mathsf{E}(S\,|\,\tau \geq i)$ depends only upon $s_{i}, \ldots, s_{n}$. Therefore, the optimal choice of $s_{i}$ depends only 
upon $s_{i + 1}, \ldots, s_{n}$. Indeed, it suffices to choose $s_{i}$ so as to maximise $\mathsf{E}(S\|\tau \geq i)$.

Using the law of total expectation again (and assuming a implicit dependence on $\tau\geq 0$ in terms on the RHS),

$$
\mathsf{E}(S\,|\,\tau \geq i) = \mathsf{E}(P_i\,|\,P_i\geq s_i)\,\mathsf{P}(P_i\geq s_i) + \mathsf{E}(S\,|\,P_i < s_i)\,\mathsf{P}(P_i < s_i).
$$

Now, as we have assumed that the price $P_{i}$ is uniformly distributed on $\[0, 1\]$, we have that 
$\mathsf{E}(P_{i}\|P_{i}\geq s_{i}) = \frac{1}{2}(1+s_{i})$ and $\mathsf{P}(P_i\geq s_i) = 1 - s_{i}$ (this follows
straight from the definition of the uniform distribution). Substituting this in gives

$$
\mathsf{E}(S\,|\,\tau \geq i) = \frac{1}{2}(1 - s_i^2) + s_{i}\,\mathsf{E}(S\,|\,P_i < s_i).
$$

This is a quadratic in $s_{i}$, which is maximised when $s_i = \mathsf{E}(S\,|\,P_i < s_i)$. Write $\tilde{s}_i$ for 
this optimal threshold value:

$$
\tilde{s}_i = \mathsf{E}(S\,|\,P_i < \tilde{s}_i)
$$

where, as noted earlier, the right hand expression depends only upon $$\tilde{s}_{i + 1},\ldots,\tilde{s}_{n}$$, due to the implicit 
conditional dependence on $\tau\geq i$. 

Let's pause here to think about the meaning of this statement; the implicit
condition in the expectation is that $\tau\geq i$ (i.e. that we have not sold up to time $i$), and that the current price 
$P_{i}$ is less than $\tilde{s}_{i}$, meaning that we are not selling now either (by the definition of our strategy).
This is actually fairly intuitive: as all the prices are independent, the situation at time $i$ of an $n$ period run is 
equivalent to starting a fresh run at time $i$ of length $n-i$, and we should only sell if the quoted price exceeds
the expected value of continuing to play on.

Furthermore, it is possible to recover the recursion relation found earlier between $$\tilde{s}_{i}$$ and
 $$\tilde{s}_{i+1}$$, by using one further application of the law of total expectation:

$$
\begin{align}
\tilde{s}_{i} &= \mathsf{E}(S\,|\,P_{i}<\tilde{s}_{i}, P_{i+1}\geq\tilde{s}_{i+1})\mathsf{P}(P_{i+1}\geq\tilde{s}_{i+1}) \\[5pt]
&\quad + \mathsf{E}(S\,|\,P_{i}<\tilde{s}_{i}, P_{i+1}<\tilde{s}_{i+1})\mathsf{P}(P_{i+1}<\tilde{s}_{i+1}) \\[5pt]
&= \mathsf{E}(P_{i + 1}|P_{i + 1}\geq \tilde{s}_{i + 1})\mathsf{P}(P_{i + 1}\geq \tilde{s}_{i + 1}) + \tilde{s}_{i+1}\mathsf{P}(P_{i + 1} < \tilde{s}_{i + 1})\\
&= \frac{1}{2}(1 - \tilde{s}_{i + 1}^2) + \tilde{s}_{i + 1}^2\\
&= \frac{1}{2}(1 + \tilde{s}_{i + 1}^2)
\end{align}
$$

where the first term in the second inequality uses the fact that if $P_{i+1}$ exceeds $$\tilde{s}_{i+1}$$, then we are definitely selling
and the expected price $S$ is equal to the (conditional) expectation of $P_{i+1}$; the second term uses a resubstitution of the
optimal threshold value $$\tilde{s}_{i+1}$$ in terms of the conditional expectation of $S$, established above; and the third equality
follows from the uniform distribution of $P_{i+1}$.

<!-- 
Define $e_{n-j}$ to be the expected return of the strategy
<p align="center">
Sell at time $i > j$ if $P_{i}\geq s_{i}$.
</p>

That is, the expected return, were we to see all but the first $j$ prices. Moreover, writing $\tilde{e}\_{n - j}$ for 
the expected return of this strategy with the optimal thresholds, we see that $\mathsf{E}(S\|P_{i} < s_{i}) = e_{n - i}$ and 
this gives the recurrence:

$$
\tilde{s}_i = \tilde{e}_{n - i}.
$$

This tells us that at time $n$ we should accept any price; at time $n - 1$ we should accept exactly the expected value 
of $P_n$; at time $n - 2$ we should settle for the exactly the expected value were we to pass on $P_{n - 2}$; and so 
on and so forth.

-->


### The recursion relation for $\tilde{s}_{i}$

At first glance, this recurrence relation is not particular familiar; however, by performing 
the substitution $t\_{k}=\frac{1}{2}(1-\tilde{s}\_{n-k})$, we obtain

$$
t_{i+1} = t_{i}(1-t_{i}), \quad t_{0} = \frac{1}{2}
$$

Hopefully, this rings some bells! It should be familiar to any first year mathematics undergraduates as 
a special case of the __logistic map__, the general form of which looks like:
 
$$
t_{i+1} = r t_{i}(1-t_{i}).
$$
 
In our case, the reproductive parameter $r=1$, and the initial 
value $t\_{0}=\frac{1}{2}$. This recurrence relation is often first encountered when 
considering the dynamics of a population of animals living in an environment with limited 
resources, and is usually used as an introduction to chaos theory. In this context, it suffices 
to say that for this choice of reproductive parameter, $t\_{i}$ is decreasing as $i$ increases, 
and gets arbitrarily close to $0$ for sufficiently large $i$. This is as expected from our problem - 
if there are a large number of times over which prices can be tracked, then over the first few times the price 
needs to be very high in order to tempt the seller.

| <a href="https://commons.wikimedia.org/wiki/File:Logistic_Bifurcation_map_High_Resolution.png"><img src="/assets/images/logisticmap.png" alt="Jordan Pierce / CC0" width="60%"/></a> |
|:--:|
| *One of the many exciting plots you get to see when studying the logistic function, showing the convergence value as $i\rightarrow\infty$ for various values of $r$, the reproductive parameter.* |

### Uniformly distributed quotes: a numerical solution

To compute the actual threshold values and expectations, we turn to some simple Python functions; the optimal thresholds are 
computed using the recursion relation, and the expectation is then computed directly using these threshold values:

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
        n (int): Number of times over which prices are offered.

    Returns:
        s (numpy.ndarray): vector of optimal strategy values.
    """
    s = np.zeros(n)
    
    for i in range(n-1):
        s[i+1] = 0.5*(1 + s[i]**2)
    s = s[::-1]
    
    return s
```

For example, if prices are provided over 12 times (the number of opportunities allowed in Animal Crossing - twice a day,
Monday to Saturday), the threshold at the first time is about 0.88, decreasing to 0 at the last time when any price has
to be taken:

```python
thresholds = strat_thresholds(n=12)
expectation = compute_exp(thresholds)
print(f'Thresholds are: ')
for time, threshold in enumerate(thresholds):
    print(f'Time {time+1}: {threshold}')
print(f'giving an expected sold price of {expectation}')
```

    Thresholds are: 
    Time 1: 0.8707450655319368
    Time 2: 0.861098212205712
    Time 3: 0.8498214073624081
    Time 4: 0.8364465402671089
    Time 5: 0.8203006037631678
    Time 6: 0.800375666500635
    Time 7: 0.7750815008766949
    Time 8: 0.741729736328125
    Time 9: 0.6953125
    Time 10: 0.625
    Time 11: 0.5
    Time 12: 0.0
    giving an expected sold price of 0.8790984845741084
    
These optimal thresholds are easier to visualise when plotted on a graph, showing the threshold for each day of the
12-period run:

| ![Optimal thresholds](/assets/images/turnip_threshold.png) |
|:--:|
| *The optimal thresholds for each day of a 12-period run* |

It is also easy to check that as the number of times increases, the expected price that the 
seller can get increases, due to the ability they have to hold out for a randomly occurring 
larger price:

```python
print('Expectation for n times:')
for time in range(1, 21):
    thresholds = strat_thresholds(n=time)
    print(f'{time} times: {compute_exp(thresholds)}')
```

    Expectation for n times:
    1 times: 0.5
    2 times: 0.625
    3 times: 0.6953125
    4 times: 0.741729736328125
    5 times: 0.7750815008766949
    6 times: 0.800375666500635
    7 times: 0.8203006037631679
    8 times: 0.8364465402671089
    9 times: 0.8498214073624082
    10 times: 0.8610982122057119
    11 times: 0.8707450655319368
    12 times: 0.8790984845741084
    13 times: 0.886407072790247
    14 times: 0.892858749346287
    15 times: 0.8985983731421079
    16 times: 0.9037395181068213
    17 times: 0.908372558293975
    18 times: 0.9125703523307703
    19 times: 0.9163923239765532
    20 times: 0.919887445721574
   
This numerical check confirms that the expected values of the $n$-period strategy are equal to the threshold values 
$(n+1)$ times from the end, as expected.

<!--
An interesting thing to note here is that the expected values of the strategy 
over $n$ times are equal to the threshold values $(n+1)$ times from the end. 
There is a straightforward way to see why this is: first, recall that, by definition, 
this threshold value is the minimum selling price to accept with $n$ times remaining.
When making the decision whether to accept, you are comparing the offered price to 
the expected price you hope to receive by waiting. Therefore, the threshold value is
exactly the expected value of the strategy over the remaining $n$ times - any price less
than this can be expected to be beaten (in the probabilistic sense) in the future.
-->

## Outstanding questions

After a bit of playing around with the uniform case we've managed to find first order recurrence describing the optimal 
threshold values for a strategy of this sort. This begs a few natural questions.

### Seize the day!

In the above we only considered strategies of the form:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$
</p>

That is to say, the price we would settle for on each day depended only upon the day itself and not upon the prices we 
had seen so far. Indeed, as we tacitly assume that the buyer only has knowledge of past and not future prices, a generic 
strategy would be of the form:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}(P_1, \ldots, P_{i-1})$
</p>

where here $s_i$ is now a function of $i-1$ variables. Can we convince ourselves that optimal strategies must be of the 
former type?

### Solving the recurrence

Having found the recurrence governing the optimal thresholds, while it may not be possible to find an exact formula for 
them it would be nice to be able to say something more about the solutions. Perhaps we could say something about their 
asymptotics?

### Flying the nest

Now that we've cut our teeth on this simple case, we would like to say something about other distributions. In 
particular, can we find a simple recurrence governing the thresholds of an optimal strategy? Can we show that it is 
always the case the these optimal thresholds are the expected returns if we choose to play on, as discussed earlier?

## Next time: Non-uniform Turnips

In the [next post](post2hyperlink) we give give an answer to each of the questions posed above.
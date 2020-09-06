---
title: "Animal Crossing Turnip Market -- When to sell?"
header:
    image: assets/images/turniproom.jpeg
toc: true
toc_label: "Contents:"
tags:
 - probability
---

{% include mathjax.html %}

This post is written in collaboration with [Jack Bartley](http://jackbartley.com/), while playing [Animal Crossing New Horizons](https://www.youtube.com/watch?v=5LAKjL3p6Gw). 

# Post 1: Turnip Mania

## Turnip Mania

In the game, one of the fastest ways of earning bells (the in game currency) and pay off your mortgage to Tom Nook is through the __Stalk Market__; essentially, this involves speculating on the price of turnips (chosen because the Japanese word for turnip, èª (kabu) is pronounced in the same way as æ ª (kabu), the word for stock).

So how does it work? The way in which turnips can be used to make a profit (or loss!) is as follows:
-  Every Sunday, a character called Daisy Mae can be found wandering around the island. She will offer to sell the player turnips at a randomly chosen (integer between 90 and 110) base price. 

![Daisy Mae](/assets/images/daisymae.jpeg){: .align-center}

- On every other day of the week, Timmy and Tommy in Nook's Cranny will offer to buy turnips from you. They will offer two prices a day (one in the morning, one in the afternoon), which may be higher or lower than the base price that the turnips were bought for from Daisy Mae.

![Timmy and Tommy](/assets/images/timmytommy.jpeg){: .align-center}

One of the first questions we can ask is the following: if we know the distribution of prices that Timmy and Tommy offer on any particular day, what is the best way to maximise the amount you get for your turnips? As is common we are interested in trying to maximise the expected profit.

## An instructive example: Uniformly distributed quotes

<!--"Hands on" proof in uniform case goes here
-->

At first glance, this recurrence relation is not particular familiar; however, by performing 
the substitution $t\_{k}=\frac{1}{2}(1-\tilde{s}\_{n-k})$, we obtain

$$
t_{i+1} = t_{i}(1-t_{i}), \quad t_{0} = \frac{1}{2}
$$

Hopefully, this rings some bells! It should be familiar to any first year undergraduates as 
a special case of the __logistic map__, with reproductive parameter $r=1$, and initial 
value $t\_{0}=\frac{1}{2}$. This recurrence relation is often first encountered when 
considering the dynamics of a population of animals living in an environment with limited 
resources, and is often used as an introduction to chaos theory. In this context, it suffices 
to say that for this choice of reproductive parameter, $t\_{i}$ is decreasing as $i$ increases, 
and gets arbitrarily close to $0$ for sufficiently large $i$. If there are a large number of 
days over which prices can be tracked, then over the first few days the price needs to be very 
high in order to tempt the seller.

<p>
<a title="Jordan Pierce / CC0" href="https://commons.wikimedia.org/wiki/File:Logistic_Bifurcation_map_High_Resolution.png">
<img width="100%" alt="Logistic Bifurcation map High Resolution" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Logistic_Bifurcation_map_High_Resolution.png/512px-Logistic_Bifurcation_map_High_Resolution.png"></a>
<em>
One of the many exciting plots you get to see when studying the logistic function, showing the convergence 
value as $i\rightarrow\infty$ for various values of $r$, the reproductive parameter.
</em>
</p>

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

## Outstanding questions

After a bit of playing around with the uniform case we've managed to find first order recurrence describing the optimal threshold values for a strategy of this sort. This begs a few natural questions.

### Seize the day!

In the above we only considered strategies of the form:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$
</p>

That is to say, the price we would settle for on each day depended only upon the day itself and not upon the prices we had seen so far. Indeed, as we tacitly assume that the buyer only has knowledge of past and not future prices, a generic strategy would be of the form:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}(X_1, \ldots, X_{i-1})$
</p>

where here $s_i$ is now a function of $i-1$ variables. Can we convince ourselves that optimal strategies must be of the former type?

### Solving the recurrence

Having found the recurrence governing the optimal thresholds, while it may not be possible to find an exact formula for them it would be nice to be able to say something more about the solutions. Perhaps we could say something about their asymptotics?

### Flying the nest

Now that we've cut our teeth on this simple case, we would like to say something about other distributions. In particular, can we find a simple recurrence governing the thresholds of an optimal strategy? Can we show that it is always the case the these optimal thresholds are the expected returns if we choose to play on, as discussed earlier?

## Next time: Non-uniform Turnips

In the [next post](post2hyperlink) we give give an answer to each of the questions posed above.

# Post 2: Non-uniform Turnips

## Last time: Turnip mania

Following on from [last time](post1hyperlink), in this post we're looking again at optimal strategies for turnip selling in Animal Crossing. Readers are advise to consult the [first post](post1hyperlink) for details on what has been covered so far, but we give a very brief summary here for the uninitiated.

We consider the following game -- a simple model for turnip selling in Animal Crossing. Let $X\_1, \ldots, X\_n$ be iid random variables. At each time $t=1, 2, \ldots, n$ the player is offered the opportunity to sell all the turnips they have for a price of $X\_i$. If the player accepts this offer then the game ends and the player ends with a revenue of $X\_i$, if the player refuses then they move to the next timestamp. If the turnips are not sold on or before time $n$ then the turnips spoil and the player walks away with nothing.

Last time we considered the special case that the $X\_i$ are iid uniform on $[0,1]$, and considered the following strategy:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$.
</p>

We write $\tilde{s}\_i$ for the expectation maximising choices of these thresholds and $\tilde{e}_n$ for the expected winnings when choosing these optimal thresholds. Last time we found that these optimal thresholds satisfy the following first order recurrence:

<p align="center">
$\tilde{s}_i = \frac{1}{2}(1 +\tilde{s}_{i + 1}^2)$ for $1\leq i<n$, with $\tilde{s}_n = 0$.
</p>

In today's post we seek to address the questions posed at the end of the last. That is, we wish to give an asymptotic solution to this non-linear recurrence and generalise some of our results from last time to arbitrary distributions.

### A disclaimer

At this point it is worth saying that anybody expecting to use our analysis to improve their turnip game would be better off looking elsewhere. Perhaps unsurprisingly it is reasonably well understood<sup>[1](#post2footnote1)</sup> how the prices in Animal Crossing are *actually* generated. Some people have even been so helpful as to make [tools](turnipprophet.io) to help people with their turnip selling, though to say much more than this might constitute **SPOILERS** (one could argue that the existence of these tools is in itself [**SPOILERS**](https://www.youtube.com/watch?v=KSRWJMM98pM)). Indeed, to identify what part of our model renders it ineffective would certain be 
<details> 
<summary> SPOILERS </summary> 
Of course, it is the assumption that the prices are independent. 
</details>

## An approximate solution: Uniformly distributed quotes

To kick things off, starting from

<p align="center">
$\tilde{s}_i = \frac{1}{2}(1 +\tilde{s}_{i + 1}^2)$ for $1\leq i< n$ and $\tilde{s}_n = 0$,
</p>

we perform the substitution $t_i = \frac{1}{2}(1 - \tilde{s}_{n-i})$ to arrive at the logistic map with initial value $1/2$ (as noted last time). That is

<p align="center">
$t_{i+1} = t_{i}(1-t_{i})$ for $0\leq i <n - 1$, with initial value $t_{0} = \frac{1}{2}$.
</p>

Next we perform one more change of variables. Defining $r\_{i} = 1/t\_{i}$ for all $i$ we obtain 

<p align="center">
$r_{i+1} = r_{i} + 1 + \frac{1}{r_{i}-1}$ for $0\leq i < n - 1$, with initial condition $r_{0} = 2$.
</p>

<details>
<summary> CLICK FOR ALGEBRA </summary>
$$
\begin{align}
	\frac{1}{t_{i+1}}&=\frac{1}{t_i(1-t_i)}\\
	&=\frac{1}{t_i}\frac{\frac{1}{t_i}}{(\frac{1}{t_i}-1)}\\
	&=\frac{r_i^2}{r_i-1}\\
	&=r_i + 1 + \frac{1}{r_i-1}.
\end{align}
$$
</details>

Thus, since we certainly have $r\_{i}> 1$ for all $i$ by induction, we have $\frac{1}{r_i-1}>0$ for all $i$ and so $r\_{i+1}\geq r\_{i} + 1$ for $0\leq i < n - 1$ and we get the lower bound

$$
r_{i}\geq i + 2
$$

for all $i$ (that is, for $0\leq i < n$). In the other direction, since we now have $r\_{i} - 1\geq i + 1$ for all $i$, it follows that $r\_{i+1}\leq r\_{i} + 1 + \frac{1}{i + 1}$ for $0\leq i < n - 1$, and we obtain the upper bound 

$$
r_{i}\leq i + 2  + H_i
$$

for all $0\leq i < n$, where we write 

$$
H_i = \sum_{j = 1}^{i}\frac{1}{j}
$$

for the $i$-th [harmonic number](https://en.wikipedia.org/wiki/Harmonic_number). Putting this all together gives

$$
r_{i} = i + O(\log{(i + 1)}),
$$

for an implicit constant independent of $i$ and $n$. Unfolding we see that

$$
t_{i} = \frac{1}{i + O(\log{(i + 1)})}
$$

and, recalling that $t\_{k}=\frac{1}{2}(1-\tilde{s}\_{n-k})$,

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + O(\log{(n - i + 1)})}.
$$

That is to say, we have ascertained the value of the optimal thresholds up to a rather small error. We note that this last observation can be stated in terms of an additive error as follows: 

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + 2} + O\left(\frac{\log{(n - i + 1)}}{(n - i + 1)^2}\right).
$$

Those of an anxious disposition might be left wondering if we can't do a little better. Indeed, we used a very crude argument to lower bound the $r_i$, which we then used to get an upper bound. Perhaps we can flip this around and use our upper bound to improve the lower bound?

### Overdoing it: amplification

Taking this one step further and substituting the upper bound $r_{i}\leq i + 2  + H_i$ into the recurrence $r_{i+1} = r_{i} + 1 + \frac{1}{r_{i}-1}$, we see that

$$
r_{i+1}\geq r_{i} + 1 + \frac{1}{i + 1 + H_i}
$$

for all $i$. This then gives

$$r_{i}\geq i + 2 + \sum_{j=1}^i\frac{1}{j + H_{j-1}}$$

for $0\leq i < n$. Now since $1/(1+x)\geq 1-x$ for all $x$ (a handy consequence of the [difference of two squares](https://en.wikipedia.org/wiki/Difference_of_two_squares)), we have 

$$
\begin{align}
\frac{1}{j + H_{j-1}}&\geq\frac{1}{j^2}(j - H_{j-1})\\
	&=\frac{1}{j} - \frac{H_{j-1}}{j^2}.
\end{align}
$$

and so, since $\sum\_{j=1}^\infty\frac{H_{j-1}}{j^2}$ is convergent, we have 

$$r_i\geq i + 2 + H_i + O(1).$$

Combining this with the earlier lower bound we see that

$$r_i= i + 2 + H_i + O(1),$$

Then using the fact that $H\_i = \log(i + 1) + O(1)$, we have

$$r_i= i + 2 + \log(i + 1) + O(1),$$

and

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + \log{(n - i + 1)} + O(1)}.
$$

Expressing in terms of an additive error this gives

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + 1} + \frac{2\log{(n - i + 1)}}{(n - i + 1)^2}+ O\left(\frac{1}{(n - i + 1)^2}\right).
$$

#### The Euler-Mascharoni constant

Of course, we actually have $H\_i = \log(i + 1) + \gamma + o(1)$, where $\gamma$ is the [Euler-Mascharoni constant](https://en.wikipedia.org/wiki/Euler%E2%80%93Mascheroni_constant), but since the additive error in our estimate for $r_i$ is otherwise $O(1)$ this named constant would be eaten up by our error. As it happens, we can push our argument a bit further and, in a sense, obtain an analogous result for the $r_i$ themselves. Here there will be a fixed constant cropping up, but it will not be the Euler-Mascharoni constant.

### Overdoing just one last time: The "Bartley-Cole" constant


Consider $\varepsilon_i = r_i - (i + 2) - H_i$, then we have 

$$
r_{i+1} - (i+3) - H_{i+1} = r_{i} -(i+2) - H_i -\left(\frac{1}{i+1}-\frac{1}{r_i - 1}\right)
$$

or, in other words,

$$
\begin{align}
\varepsilon_i - \varepsilon_0 &= \sum_{j=0}^{i-1}(\varepsilon_{j+1} - \varepsilon_{j})\\
	&=-\sum_{j=0}^{i-1}\left(\frac{1}{j+1} - \frac{1}{r_j - 1}\right)\\
\end{align}
$$

Now, since we've already established that $i+2 < r_i\leq i+2+O(\log(i+1))$, we have $0<\frac{1}{j+1} - \frac{1}{r\_j - 1}\leq O\left(\frac{\log(j+1)}{(j+1)^2}\right)$ as before. Thus this series converges to some limit and combining this with the fact that $H\_i = \log(i+1) + \gamma + o(1)$ we see that

$$
r_i= i + 2 + \log(i+1) + \tau + o(1),
$$

for some fixed constant $\tau$, which we call the [Bartley-Cole constant](citationneeded). This then gives

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + 1 + \log{(n - i + 1)} + \tau + o(1)}.
$$

and

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + 1} + \frac{2\log{(n - i + 1)}}{(n - i + 1)^2}+ \frac{2\tau}{(n - i + 1)^2} + o\left(\frac{1}{(n - i + 1)^2}\right)
$$

(as $n - i$ goes to infinity).

### Overdoing it yet again

Naturally this sort of thing could go on forever, but we'll leave it there!

### Uniform on an arbitrary interval

While we have assumed the daily quoted prices $X\_{i}$ have been uniformly distributed over $[0, 1]$ it is clear that the results derived above extend easily to the case of a uniform distribution over an arbitary interval $[a, b]$, by linear scaling -- specifically, by letting $Y\_{i} = a + (b-a)X\_{i}$.


## Arbitrary (non-negative) turnips

<!-- Intro to the arbitrary non-neg distribution case -->

### An instructive example revisited: Uniformly distributed quotes

The easiest distribution to consider is the uniform distribution -- specifically, assume that on each selling day, Timmy and Tommy offer a price that is uniformly distributed over some interval.

Let $X\_{1}, ..., X\_{n}\sim U[0, 1]$ be 
[iid](https://en.wikipedia.org/wiki/Independent_and_identically_distributed_random_variables) random variables, representing the price offered at time $i$, and suppose that the turnips spoil before another price is offered.

Consider the following strategy:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$
</p>

and write $S$ for the price the turnips are consequently sold at.

Put simply, on each day there is a threshold $s\_{i}$ which represents the minimum price at which we would be prepared to sell on that day. For example, as we need to sell the turnips before they spoil, we should accept any price at time $t=n$; in other words, the optimal such strategy should have $s\_{n}=0$. 

Let $\tau$ be the time at which we sell, that is $\tau = \min\\{ i:X\_{i}\geq s\_{i}\\}$. Then, by the law of total expectation, we see that for any $i$, we have

$$
E(S) = E(S|\tau < i)P(\tau < i) + E(S|\tau \geq i)P(\tau \geq i).
$$

Note that $E(S\|\tau < i)$, $P(\tau < i)$ and $P(\tau \geq i)$ depend only upon $s\_{1}, \ldots, s\_{i - 1}$, whereas $E(S\|\tau \geq i)$ depends only upon $s\_{i}, \ldots, s\_{n}$. Therefore, the optimal choice of $s\_{i}$ depends only upon $s\_{i + 1}, \ldots, s\_{n}$. Indeed, it suffices to choose $s\_{i}$ so as to maximise $E(S\|\tau \geq i)$.

Next,

$$
\begin{align}
E(S|\tau \geq i) &= E(S|\tau = i)P(\tau = i | \tau \geq i) + E(S|\tau > i)P(\tau>i|\tau\geq i)\\
	&= E(X_i|X_i\geq s_i)P(X_i\geq s_i) + E(S|\tau>i)P(X_i < s_i).
\end{align}
$$

Now since $E(X\_{i}\|X\_{i}\geq s\_{i}) = \frac{1}{2}(1+s\_{i})$ and $P(X\_i\geq s\_i) = 1 - s\_{i}$ we have 

$$
E(S|\tau \geq i) = \frac{1}{2}(1 - s_i^2) + s_i E(S|\tau > i).
$$

Writing $\tilde{s}\_i$ for the optimal choice of $s_i$, we then have

$$
\tilde{s}_i = E(S|X_i < s_i)
$$

where, as noted earlier, the right hand expression depends only upon $s\_{i + 1}, \ldots, s\_n$. 

Now define $\tilde{e}\_n$ to be the expectation of the optimal strategy of this form when this game is played over $n$ days. Then noting that $E(S\|\tau > i)$ is simply the expectation of this game played over $n-j$ days with thresholds $s\_{i+1}, \ldots, s\_n$ we obtain the recurrence:

$$
\tilde{s}_i = \tilde{e}_{n - i}.
$$


This tells us that at time $n$ we should accept any price; at time $n - 1$ we should accept exactly the expected value of $X\_n$; at time $n - 2$ we should settle for exactly the expected return of our strategy were we to pass on $X\_{n - 2}$ and play on for the final two days; and so on and so forth.

Indeed, it is possible to do one better and express the right hand side (that is, $\tilde{e}\_{n-i}$) solely in terms of $\tilde{s}\_{i+1}$, finding a recursive relationship between $\tilde{s}\_{i}$ and $\tilde{s}\_{i+1}$ alone.


Again, using the total law of expectation we see that

$$
\begin{align}
\tilde{e}_{n - i} &= E(S|\tau = i + 1)P(\tau = i + 1 | \tau > i) + E(S| \tau > i + 1)P( \tau > i + 1 | \tau > i)\\
	&= E(X_{i + 1}|X_{i + 1}\geq \tilde{s}_{i + 1})P(X_{i + 1}\geq \tilde{s}_{i + 1}) + E(S|X_{i + 1} < \tilde{s}_{i + 1})P(X_{i + 1} < \tilde{s}_{i + 1})\\
	&= \frac{1}{2}(1 - \tilde{s}_{i + 1}^2) + \tilde{s}_{i + 1}^2\\
	&= \frac{1}{2}(1 + \tilde{s}_{i + 1}^2)
\end{align}
$$

where in the third equality we make critial use of the fact that $E(X\_{i+1}\|X\_{i+1}\geq\tilde{s}\_{i+1})=\frac{1}{2}(1+\tilde{s}\_{i + 1})$ and $E(S\|X\_{i + 1} < \tilde{s}\_{i + 1}) = \tilde{s}\_{i + 1}$.

### Non-negative Turnips

<!-- Below is the old version of the arbitrary distribution -->

<!-- ## Quotes with an arbitrary distribution

What about more general distributions? In particular, if the distribution is known for prices $x>0$, 
what can we infer about the optimal threshold values $\tilde{s}\_{i}$?

Let $f(x),\, x\in [0, \infty)$ be the probability density function of the daily quotes $X\_{i}$, with 
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
the threshold values $\{s\_{i}\}$. To maximise the expected price, we do as we did before and find the
stationary point of the expectation. The steps follow the same logic as for the uniform case, and give a set
 of equations for the optimal threshold values $\tilde{s}\_{k}$.

$$
\begin{align}
\tilde{s}_{k} &= \tilde{s}_{k+1}F(\tilde{s}_{k+1}) + \int_{\tilde{s}_{k+1}}^{\infty}xf(x)dx \\
&= \tilde{s}_{k+1}F(\tilde{s}_{k+1}) + E(X_{0}) - \int_{0}^{\tilde{s}_{k+1}}xf(x)dx
\end{align}
$$

In this formula, $X\_{0}$ has pdf $f(x)$, and this step is only done to avoid the computation of repeated infinite
integrals. 

By integration by parts (or simply differentiating the right hand side with respect to $\tilde{s}\_{k + 1}$) we obtain the following equivalent recurrence:

$$
\begin{align}
\tilde{s}_{k} &= E(X) + \int_{0}^{\tilde{s}_{k+1}} F(x)dx.
\end{align}
$$

In the case that the $X\_{i}$ are non-negative, writing $\bar{F}(x) = 1 - F(x)$, we have

$$
\begin{align}
\tilde{s}_{k} &= \tilde{s}_{k+1} + \int_{\tilde{s}_{k+1}}^{\infty}\bar{F}(x)dx.
\end{align}
$$
-->
 
### Arbitrary (non-negative) turnips: a recurrence

<!-- Give the cleaner version of the recurrence -->

## Carpe rāpa!: optimality and sticking to your guns

It is high time we address on small technical question, must the optimal strategy actually be of the stated form? Recall that we have thus for only considered strategies of the form:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$
</p>

That is, the price we sell at on each given day depends only upon the day itself -- we do not dwell on the past and factor in the prices we've seen so far. Since we ought to assume that the buyer only has knowledge of past and not future prices, the most general form a strategy could take would be:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}(X_1, \ldots, X_{i-1})$
</p>

where each $s_i$ is a function of the previous $i-1$ prices offered. We note that, regardless of the specific distribution of the $X\_i$ we will always have, for any $i$, that

$$
E(S) = E(S|\tau < i)P(\tau < i) + E(S|\tau \geq i)P(\tau \geq i).
$$

by the law of total expectation. As remarked earlier, $E(S\|\tau < i)$, $P(\tau < i)$ and $P(\tau \geq i)$ depend only upon $s\_1,\ldots, s\_{i-1}$, whereas $E(S\|\tau \geq i)$ depends upon $s\_i, \ldots, s\_n$. Fortunately, as the conditional expectation of $S$ given that $\tau\geq i$ for any such fixed specification of $X\_1,\ldots, X\_{i-1}$ does not depend upon the specific choice of these prices, we can happily restrict our attention to those strategies with a constant threshold for each day.

## Outstanding questions

<!-- Add outstanding questions -->

<a name="post2footnote1">1</a> This author doesn't know to what degree people know their models to be correct. It's my understanding that the way the prices are generated hasn't changed a great deal for earlier games in the series but I'm unsure if at any point people were certain of the model.

# Post 3: Asymptotic Swede

(or is it Turnips?<sup>[1](#myfootnote1)</sup>)

## Last time: Non-uniform Turnips

<!-- Brief recap -->

## An approximate solution: Exponentially distributed quotes

Suppose that $X\_{1}, \ldots, X\_{n}\sim\text{Exp}(\lambda)$ are iid. Then the optimal threshold values are given by

$$
\tilde{s}_{i} = \tilde{s}_{i + 1} + \lambda^{ - 1}e^{-\lambda \tilde{s}_{i + 1}}, \quad \tilde{s}_{n} = 0.
$$

Performing the substitution $t\_{i}=e^{\lambda\tilde{s}\_{n-i}}$, we obtain

$$
t_{i+1} = t_{i}e^{1/t_{i}}, \quad t_{0} = 1.
$$

Now note that $1 + x\leq e^x \leq 1 + x + x^2$ for $x\leq 1$ (indeed, $(e^x - 1 - x)/x^2$ is increasing for $x\leq 1$). Thus since we clearly have $t\_i\geq 1$ for all $i$, we have

$$
t_{i+1} \geq t_{i} + 1
$$

and

$$
t_{i+1} \leq t_{i} + 1 + 1/t_{i}.
$$

Then, much as before, the first gives $t\_i\geq i + 1$ and the latter $t\_i\leq i + 1 + H\_i$. Putting this all together we see that

$$
t_i = i + O(\log{i})
$$

and unfolding gives

$$
\tilde{s}_{i} = \log{n - i} + O(\frac{\log{n - i}}{n - i}).
$$

In particular we see that

$$
\tilde{s}_0 = (1 + O(1/n))\log{n}.
$$

## An approximate solution for an arbitrary non-negative distribution

Recall that the optimal thresholds are the solutions to the backwards first order recurrence

$$
\tilde{s}_{n} = 0
$$

and

$$
\tilde{s}_{k} = \tilde{s}_{k+1} + \int_{\tilde{s}_{k+1}}^{\infty}\bar{F}(x)dx
$$

for $0\leq k < n$.

Or equivalently, writing $\varphi(s) = \int_{s}^{\infty}\bar{F}(x)dx$

$$
\tilde{e}_{0} = 0
$$

and

$$
\tilde{e}_{i+1} = \tilde{e}_{i} + \varphi(\tilde{e}_{i})
$$

for $0\leq i < n$.

### A "continuized" system

Presented with such a non-linear recurrence, it's interesting to consider if there is anything to be learned from the "continuized" system:

$$
e'(t) = \varphi(e(t))
$$

for $t\geq 0$ and $e(0) = 0$. Our system is simply the approximant to this continuous system given by the Euler method (with a step size of one). With this in mind we define

$$
\Phi(t) = \int_0^t \frac{1}{\varphi(\zeta)}d\zeta
$$

noting that $e(t) = \Phi^{-1}(t)$ is the solution to the continuized system.

### A lower bound

We will estimate $e\_i$ by considering the quantity

$$
\Phi(e_{i+1}) - \Phi(e_i).
$$

First, we will show that $\Phi(t + \varphi(t)) - \Phi(t)\geq 1$ for any $t\geq 0$. Note that since $e\_{i+1} = e\_i + \varphi(e\_i)$, this implies that

$$
\begin{align}
\Phi(e_i) &= \sum_{j=0}^{i-1}\Phi(e_{j+1}) - \Phi(e_j)\\
&\geq i
\end{align}
$$

and so $e\_i\geq \Phi^{-1}(i)$.

In fact this follows immediately since

$$
\begin{align}
\Phi(t + \varphi(t)) - \Phi(t) &= \int_t^{t+\varphi(t)}1/\varphi(\zeta)d\zeta\\
&\geq \varphi(t)\min_{t\leq\zeta\leq t+\varphi(t)}1/\varphi(\zeta)\\
&\geq 1
\end{align}
$$

as $\varphi(\zeta)$ being decreasing ensures $1/\varphi(\zeta)$ is increasing.

### An upper bound

In the other direction

$$
\begin{align}
\Phi(t + \varphi(t)) - \Phi(t) &= \int_t^{t+\varphi(t)}1/\varphi(\zeta)d\zeta\\
&\leq \varphi(t)\max_{t\leq\zeta\leq t+\varphi(t)}1/\varphi(\zeta)\\
&\leq \varphi(t)/\varphi(t+\varphi(t))
\end{align}
$$

Now, since $\frac{d}{dt}\varphi(t) = -\bar{F}(x)$ and the cdf is increasing, by IVT we have $\varphi(t+\varphi{t})-\varphi(t)\geq -\varphi(t)\bar{F}(t)$ and so $\varphi(t+\varphi(t))\geq\varphi(t)F(t)$ and in particular

$$
\Phi(e_{i+1}) - \Phi(e_i) \leq 1/F(e_i).
$$

From this it's just a small jump to a decent upper bound in terms of $i$. Writing $\alpha = E(\Phi(X))$ we have

$$
\begin{align}
\bar{F}(e_i) &= P(X\geq e_i)\\
&= P(\Phi(X)\geq \Phi(e_i))\\
&\leq P(\Phi(X)\geq i)\\
&\leq \frac{\alpha}{i}
\end{align}
$$

where the first inequality follows since $\Phi(e\_i)\geq i$, and the second by Markov's inequality. This in turn gives 

$$
\begin{align}
\frac{1}{F(e_i)} &\leq \frac{1}{1-\frac{\alpha}{i}}\\
&\leq 1 + O(\frac{1}{i})
\end{align}
$$

for an implicit constant depending only upon $\alpha$. Therefore we have 

$$
\begin{align}
\Phi(e_i) &= \sum_{i=0}^{n-1}\Phi(e_{i+1}) - \Phi(e_i)\\
&\leq \sum_{j=1}^i 1 + O(1/j)\\
&\leq i + O(\log{i}).
\end{align}
$$

Putting this all together we see that $\Phi(e\_n) = n + O(\log{n})$ and so $e\_n = \Phi^{-1}(n + O(\log{n}))$. All this is to say that the solutions to the discrete and continuized systems are indeed quite closely related.

<a name="myfootnote1">1</a>: Oddly enough there is a bit of a discrepancy in [what is meant by turnips in the UK](https://en.wikipedia.org/wiki/Turnip).

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


<a name="myfootnote2">2</a>: [Charles Townshend, 2nd Viscount Townshend](https://en.wikipedia.org/wiki/Charles_Townshend,_2nd_Viscount_Townshend#%22Turnip%22_Townshend).

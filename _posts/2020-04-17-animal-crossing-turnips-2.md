---
title: "Animal Crossing Turnip Market -- When to sell?"
excerpt: "Post 2 - Asymptotics and arbitrary distributions"
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

# Post 2: Non-uniform Turnips

## Last time: Turnip mania

Following on from [last time]({% post_url 2020-04-17-animal-crossing-turnips-1 %}), in this post we're looking again at 
optimal strategies for turnip selling in Animal Crossing. Readers are advise to consult the 
[first post]({% post_url 2020-04-17-animal-crossing-turnips-1 %}) for details on what has been covered so far, but we 
give a very brief summary here for the uninitiated.


We consider the following game -- a simple model for turnip selling in Animal Crossing. Let $P\_1, \ldots, P\_n$ be iid 
random variables. At each time $t=1, 2, \ldots, n$ the player is offered the opportunity to sell all the turnips they 
have for a price of $P\_i$. If the player accepts this offer then the game ends and the player ends with a revenue of 
$P\_i$, if the player refuses then they move to the next timestamp. If the turnips are not sold on or before time $n$ 
then the turnips spoil and the player walks away with nothing.

Last time we considered the special case that the $P\_i$ are iid uniform on $[0,1]$, and considered the following 
strategy:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$.
</p>

We write $\tilde{s}\_i$ for the expectation maximising choices of these thresholds and $\tilde{e}_n$ for the expected 
winnings when choosing these optimal thresholds. Last time we found that these optimal thresholds satisfy the following 
first order recurrence:

<p align="center">
$\tilde{s}_i = \frac{1}{2}(1 +\tilde{s}_{i + 1}^2)$ for $1\leq i<n$, with $\tilde{s}_n = 0$.
</p>

In today's post we seek to address the questions posed at the end of the last. That is, we wish to give an asymptotic 
solution to this non-linear recurrence and generalise some of our results from last time to arbitrary distributions.

### A disclaimer

At this point it is worth saying that anybody expecting to use our analysis to improve their turnip game would be 
better off looking elsewhere. Perhaps unsurprisingly it is reasonably well understood<sup>[1](#post2footnote1)</sup> 
how the prices in Animal Crossing are *actually* generated. Some people have even been so helpful as to make 
[tools](turnipprophet.io) to help people with their turnip selling, though to say much more than this might constitute 
**SPOILERS** (one could argue that the existence of these tools is in itself 
[**SPOILERS**](https://www.youtube.com/watch?v=KSRWJMM98pM)). Indeed, to identify what part of our model renders it 
ineffective would certain be 
<details> 
<summary> SPOILERS </summary> 
Of course, it is the assumption that the prices are independent. 
</details>

## An approximate solution: Uniformly distributed quotes

To kick things off, starting from

<p align="center">
$\tilde{s}_i = \frac{1}{2}(1 +\tilde{s}_{i + 1}^2)$ for $1\leq i< n$ and $\tilde{s}_n = 0$,
</p>

we perform the substitution $t_i = \frac{1}{2}(1 - \tilde{s}_{n-i})$ to arrive at the logistic map with initial value 
$1/2$ (as noted last time). That is

<p align="center">
$t_{i+1} = t_{i}(1-t_{i})$ for $0\leq i <n - 1$,
</p>

with initial value $t_{0} = \frac{1}{2}$. Next we perform one more change of variables: defining $r\_{i} = 1/t\_{i}$ 
for all $i$ we obtain 

<p align="center">
$r_{i+1} = r_{i} + 1 + \frac{1}{r_{i}-1}$ for $0\leq i < n - 1$,
</p>

with initial condition $r_{0} = 2$.
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

From this recurrence relation, we certainly have $r\_{i}> 1$ for all $i$, e.g. by induction. Thus, we have 
$\frac{1}{r_i-1}>0$ for all $i$ and so $r\_{i+1}\geq r\_{i} + 1$ and we get the lower bound

$$
r_{i}\geq i + 2
$$

for all $i$ (that is, for $0\leq i < n$). In the other direction, since we now have $r\_{i} - 1\geq i + 1$ for all $i$, 
it follows that $r\_{i+1}\leq r\_{i} + 1 + \frac{1}{i + 1}$ for $0\leq i < n - 1$, and we obtain the upper bound 

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

That is to say, we have ascertained the value of the optimal thresholds up to a rather small error. We note that this 
last observation can be stated in terms of an additive error as follows: 

$$
\tilde{s}_{i} = 1 - \frac{2}{n - i + 1} + O\left(\frac{\log{(n - i + 1)}}{(n - i + 1)^2}\right).
$$

Those of an anxious disposition might be left wondering if we can't do a little better. Indeed, we used a very crude 
argument to lower bound the $r_i$, which we then used to get an upper bound. Perhaps we can flip this around and use our 
upper bound to improve the lower bound?

### Overdoing it: amplification

Taking this one step further and substituting the upper bound $r_{i}\leq i + 2  + H_i$ into the recurrence 
$r_{i+1} = r_{i} + 1 + \frac{1}{r_{i}-1}$, we see that

$$
r_{i+1}\geq r_{i} + 1 + \frac{1}{i + 1 + H_i}
$$

for all $i$. This then gives

$$r_{i}\geq i + 2 + \sum_{j=1}^i\frac{1}{j + H_{j-1}}$$

for $0\leq i < n$. Now since $1/(1+x)\geq 1-x$ for all $x$ (a handy consequence of the 
[difference of two squares](https://en.wikipedia.org/wiki/Difference_of_two_squares)), we have 

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

Of course, we actually have $H\_i = \log(i + 1) + \gamma + o(1)$, where $\gamma$ is the 
[Euler-Mascharoni constant](https://en.wikipedia.org/wiki/Euler%E2%80%93Mascheroni_constant), but since the additive 
error in our estimate for $r_i$ is otherwise $O(1)$ this named constant would be eaten up by our error. As it happens, 
we can push our argument a bit further and, in a sense, obtain an analogous result for the $r_i$ themselves. Here there 
will be a fixed constant cropping up, but it will not be the Euler-Mascharoni constant.

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

Now, since we've already established that $i+2 < r_i\leq i+2+O(\log(i+1))$, we have 
$0<\frac{1}{j+1} - \frac{1}{r\_j - 1}\leq O\left(\frac{\log(j+1)}{(j+1)^2}\right)$ as before. Thus this series converges 
to some limit and combining this with the fact that $H\_i = \log(i+1) + \gamma + o(1)$ we see that

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

In fact, from some numerical experiments, the value of $\tau$ appears to be around __-0.232006__.

### Overdoing it yet again

Naturally this sort of thing could go on forever, but we'll leave it there!

### Uniform on an arbitrary interval

While we have assumed the daily quoted prices $P\_{i}$ have been uniformly distributed over $[0, 1]$ it is clear that 
the results derived above extend easily to the case of a uniform distribution over an arbitary interval $[a, b]$, by 
linear scaling -- specifically, by letting $Y\_{i} = a + (b-a)P\_{i}$.


## Arbitrary (non-negative) turnips

Having gave a much more accurate solution to the uniform case we now turn our attention to the question of what we can 
do in general. So as to not jump straight in the deep end we first give another approach for the uniform case, being 
careful to keep things as general as possible for as long as possible.

### An instructive example revisited: Uniformly distributed quotes

Consider as before our strategy:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$
</p>

and write $S$ for the price the turnips are consequently sold at.

<!-- Put simply, on each day there is a threshold $s\_{i}$ which represents the minimum price at which we would be 
prepared to sell on that day. For example, as we need to sell the turnips before they spoil, we should accept any price 
at time $t=n$; in other words, the optimal such strategy should have $s\_{n}=0$.  -->

Let $\tau$ be the time at which we sell, that is $\tau = \min\\{ i:P\_{i}\geq s\_{i}\\}$. Then, by the law of total 
expectation, we see that for any $i$, we have

$$
E(S) = E(S|\tau < i)P(\tau < i) + E(S|\tau \geq i)P(\tau \geq i).
$$

Note that $E(S\|\tau < i)$, $P(\tau < i)$ and $P(\tau \geq i)$ depend only upon $s\_{1}, \ldots, s\_{i - 1}$, whereas 
$E(S\|\tau \geq i)$ depends only upon $s\_{i}, \ldots, s\_{n}$. Therefore, the optimal choice of $s\_{i}$ depends only 
upon $s\_{i + 1}, \ldots, s\_{n}$. Indeed, it suffices to choose $s\_{i}$ so as to maximise $E(S\|\tau \geq i)$.

Next,

$$
\begin{align}
E(S|\tau \geq i) &= E(S|\tau = i)P(\tau = i | \tau \geq i) + E(S|\tau > i)P(\tau>i|\tau\geq i)\\
	&= E(P_i|P_i\geq s_i)P(P_i\geq s_i) + E(S|\tau>i)P(P_i < s_i).
\end{align}
$$

Now since $E(P\_{i}\|P\_{i}\geq s\_{i}) = \frac{1}{2}(1+s\_{i})$ and $P(P\_i\geq s\_i) = 1 - s\_{i}$ we have 

$$
E(S|\tau \geq i) = \frac{1}{2}(1 - s_i^2) + s_i E(S|\tau > i).
$$

Writing $\tilde{s}\_i$ for the optimal choice of $s_i$, we then have

$$
\tilde{s}_i = E(S|\tau > i)
$$

where, as noted earlier, the right hand expression depends only upon $s\_{i + 1}, \ldots, s\_n$. 

Now define $\tilde{e}\_n$ to be the expectation of the optimal strategy of this form when this game is played over $n$ 
days. Then noting that $E(S\|\tau > i)$ is simply the expectation of this game played over $n-j$ days with thresholds 
$s\_{i+1}, \ldots, s\_n$ we obtain the recurrence:

$$
\tilde{s}_i = \tilde{e}_{n - i}.
$$


This tells us that at time $n$ we should accept any price; at time $n - 1$ we should accept exactly the expected value 
of $P\_n$; at time $n - 2$ we should settle for exactly the expected return of our strategy were we to pass on 
$P\_{n - 2}$ and play on for the final two days; and so on and so forth. Put simply, we should accept exactly that 
price that we would achieve in expectation were we to pass on today's price and play on.

Indeed, it is possible to do one better and express the right hand side (that is, $\tilde{e}\_{n-i}$) solely in terms 
of $\tilde{s}\_{i+1}$, finding a recursive relationship between $\tilde{s}\_{i}$ and $\tilde{s}\_{i+1}$ alone.


Again, using the total law of expectation we see that

$$
\begin{align}
\tilde{e}_{n - i} &= E(S|\tau = i + 1)P(\tau = i + 1 | \tau > i) + E(S| \tau > i + 1)P( \tau > i + 1 | \tau > i)\\
	&= E(P_{i + 1}|P_{i + 1}\geq \tilde{s}_{i + 1})P(P_{i + 1}\geq \tilde{s}_{i + 1}) + \tilde{e}_{n-(i+1)}P(P_{i + 1} < \tilde{s}_{i + 1})\\
	&= \frac{1}{2}(1 - \tilde{s}_{i + 1}^2) + \tilde{s}_{i + 1}^2\\
	&= \frac{1}{2}(1 + \tilde{s}_{i + 1}^2)
\end{align}
$$

where in the third equality we make critial use of the fact that $\tilde{e}_{n-(i+1)} = \tilde{s}\_{i + 1}$.

### Non-negative Turnips

Clearly there is not a great deal to tweak to prove a similar result for a general distribution.

Suppose now that $P\_1, \ldots, P\_n$ are iid and we follow a strategy of the same form. Then the argument above still 
tells us that the optimal choice of $s\_i$ depends only upon $s\_{i + 1}, \ldots, s\_n$. In particular we must choose 
$s\_{i}$ so as to maximise $E(S\|\tau \geq i)$. As before we could write

$$
E(S|\tau \geq i) = E(P_i|P_i\geq s_i)P(P_i\geq s_i) + E(S|\tau>i)P(P_i < s_i),
$$

however it probably makes more sense to write it as follows:

$$
E(S|\tau \geq i) = \int_{s_i}^{\infty}xf_X(x)dx + \int_{-\infty}^{s_i} \tilde{e}_{n-i}f_X(x)dx
$$

where each integral corresponds exactly to one of the products in the previous expression for $E(S\|\tau \geq i)$. Or, 
more succintly, as:

$$
E(S|\tau \geq i) = \int_{-\infty}^{\infty}g(x;s_i)f_X(x)dx
$$

where $g(x;s\_i)=\tilde{e}\_{n-i}$ for $x\leq s\_i$ and $g(x;s\_i) = x$ otherwise. 

Now it is easy to see that $\tilde{e}\_{n-i}$ is the *unique* choice of $s\_i$ which maximises $g(x;s\_i)$ for every 
$x$. That is to say, we have $g(x;\tilde{e}\_{n-i})\geq g(x;s\_i)$ for all $x$, and if $s\_i\neq\tilde{e}\_{n-i}$ then 
there exists $x$ such that $g(x;\tilde{e}\_{n-i}) > g(x;s\_i)$.

In fact, this is exactly the algebraic way of framing the argument given in [Turnip Mania](post1hyperlink). Indeed, we 
should certainly never settle for a price less than $\tilde{e}\_{n-i}$ as we would simply be better off (in expectation) 
by playing on. Algebraically this is reflected by the fact that if $s\_i<\tilde{e}\_{n-i}$, then we have 
$g(x;s\_i)=x<\tilde{e}\_{n-i}=g(x;\tilde{e}\_{n-i})$ for $s\_i<x< \tilde{e}\_{n-i}$. Whereas, if we are too picky and 
hold out for a price higher than $\tilde{e}\_{n-i}$, then we are simply wasting a perfectly good price in the event 
that we are offered something between $\tilde{e}\_{n-i}$ and $s\_i$. Algebraically, this is reflected by the fact that 
if $s\_i>\tilde{e}\_{n-i}$, then we have $g(x;s\_i)=\tilde{e}\_{n-i}<x=g(x;\tilde{e}\_{n-i})$ for 
$\tilde{e}\_{n-i}< x< s\_i$.

All this is to say that we recover the key fact that 

$$
\tilde{s_i}=\tilde{e}_{n-i}.
$$

All that remains is to give a first order recurrence for these optimal thresholds.

#### Arbitrary (non-negative continuous) turnips: a recurrence

For algebraic simplicity we consider the case that the random variables are non-negative and continuous.

Much as with the uniform case we begin from

$$
\begin{align}
\tilde{e}_{n - i} &= E(S|\tau = i + 1)P(\tau = i + 1 | \tau > i) + E(S| \tau > i + 1)P( \tau > i + 1 | \tau > i)\\
	&=E(P_{i+1}|P_{i+1}\geq \tilde{s}_{i+1})P(P_{i+1}\geq \tilde{s}_{i+1}) + \tilde{s}_{i+1}F(\tilde{s}_{i+1})
	\end{align}
$$

Since $\tilde{e}\_{n - i} = \tilde{s}\_{i+1}$ this at least gives a first order recurrence, however, we would prefer 
something cleaner. Writing $\tilde{s}\_{i+1}F(\tilde{s}\_{i+1}) = \tilde{s}\_{i+1} - \tilde{s}\_{i+1}\bar{F}(\tilde{s}\_{i+1})$ 
and defining

$$
\phi(t) =  (E(X|X\geq t) - t)\bar{F}(t)
$$

gives

$$
\tilde{s}_{i} = \tilde{s}_{i+1} + \phi(\tilde{s}_{i+1}).
$$

Thus it remains to better understand $\phi(\tilde{s}_{i+1})$.

#### The continuous case

In the case that the $P\_i$ are continuous we have

$$
\phi(t) =  \int_{t}^\infty xf(x)dx - t\bar{F}(t).
$$

Now, it follows from integration by parts that $\phi(t) = \int\_t^\infty \bar{F}(x)dx$. We note that this does not 
require that the random variables are non-negative. Altogether this gives

$$
\tilde{s}_{i} = \tilde{s}_{i+1} + \phi(\tilde{s}_{i+1}).
$$

where $\phi(t) = \int\_t^\infty \bar{F}(x)dx$.

<!-- In the case that the $P\_i$ are continuous random variables this may be written as: -->

<!-- $$ -->
<!-- \tilde{e}_{n - i} = \int_{\tilde{s}_{i+1}}^\infty xf(x)dx + \tilde{s}_{i+1}F(\tilde{s}_{i+1}). -->
<!-- $$ -->

<!-- This at least gives a first order recurrence for the $\tilde{s}_{i}$: -->

<!-- $$ -->
<!-- \tilde{s}_{i} = \int_{\tilde{s}_{i+1}}^\infty xf(x)dx + \tilde{s}_{i+1}F(\tilde{s}_{i+1}) -->
<!-- $$ -->

<!-- however we would prefer something cleaner. First we write $\tilde{s}\_{i+1}F(\tilde{s}\_{i+1}) = \tilde{s}\_{i+1} - \tilde{s}\_{i+1}\bar{F}(\tilde{s}\_{i+1})$ to give -->

<!-- $$ -->
<!-- \tilde{s}_{i} = \tilde{s}_{i+1} + \int_{\tilde{s}_{i+1}}^\infty xf(x)dx - \tilde{s}_{i+1}\bar{F}(\tilde{s}_{i+1}). -->
<!-- $$ -->

<!-- We then define $\Phi(t) =  \int_{t}^\infty xf(x)dx - t\bar{F}(t). -->


Either by integration by parts, or by noting that differentiating the RHS with respect to $\tilde{s}\_{i+1}$ gives 
$F(\tilde{s}_{i+1})$, we see that

$$
\tilde{e}_{n - i} = \mu + \int_{0}^{\tilde{s}_{i+1}}F(x)dx.
$$

Now since $\mu = \int\_0^\infty \bar{F}(x)dx$, and of course $F(x) = 1 - \bar{F}(x)$, the RHS is equal to 
$\tilde{s}\_{i+1} + \int\_{\tilde{s}\_{i+1}}^\infty \bar{F}(x) dx$. That is to say, we obtain a rather nice first order 
recurrence:

$$
\tilde{s}_{i} = \tilde{s}_{i+1} + \int_{\tilde{s}_{i+1}}^\infty \bar{F}(x) dx.
$$

Writing $\phi(t)=\int_{t}^\infty \bar{F}(x) dx$, this can then be expressed as

$$
\tilde{s}_{i} = \tilde{s}_{i+1} + \phi(\tilde{s}_{i+1}).
$$


<!-- Below is the old version of the arbitrary distribution -->

<!-- ## Quotes with an arbitrary distribution

What about more general distributions? In particular, if the distribution is known for prices $x>0$, 
what can we infer about the optimal threshold values $\tilde{s}\_{i}$?

Let $f(x),\, x\in [0, \infty)$ be the probability density function of the daily quotes $P\_{i}$, with 
corresponding cumulative density function $F(x)$. The expected sold price takes the same form as given earlier:

$$
\begin{align}
E(X) &= \sum_{i=1}^{n}E\left(P_{i}|T_{i}\right)P\left(T_{i}\right) \\
&= \sum_{i=1}^{n}E\left(P_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right)P\left(S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) \\
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
E\left(P_{i}\;\middle|\; S_{i}\cap\bigcap_{j<i}S_{j}^{c}\right) &= E\left(P_{i}\;\middle|\;S_{i}\right) \\
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
&= \tilde{s}_{k+1}F(\tilde{s}_{k+1}) + E(P_{0}) - \int_{0}^{\tilde{s}_{k+1}}xf(x)dx
\end{align}
$$

In this formula, $P\_{0}$ has pdf $f(x)$, and this step is only done to avoid the computation of repeated infinite
integrals. 

By integration by parts (or simply differentiating the right hand side with respect to $\tilde{s}\_{k + 1}$) we obtain 
the following equivalent recurrence:

$$
\begin{align}
\tilde{s}_{k} &= E(X) + \int_{0}^{\tilde{s}_{k+1}} F(x)dx.
\end{align}
$$

In the case that the $P\_{i}$ are non-negative, writing $\bar{F}(x) = 1 - F(x)$, we have

$$
\begin{align}
\tilde{s}_{k} &= \tilde{s}_{k+1} + \int_{\tilde{s}_{k+1}}^{\infty}\bar{F}(x)dx.
\end{align}
$$
-->
 
### A note on our assumptions: existence of expectations

We have implicitly assumed throughout that all expectations exist. This is not an issue since the original question 
makes little sense unless the $P\_i$ have a well defined expectation, and this is enough to ensure that all later 
expectations exist. 

#### Discrete random variables

We have also assumed throughout that the random variables are continuous. From here on we will consider only the case 
that the $P\_i$ are continuous. All we will say on this subject is that a similar result will still hold relating the 
optimal thresholds to the 'play on' expectations. Indeed, such a result can be obtained simply by replacing integrals 
with sums in the proof given earlier. The key difference of course is that these expectations may not be in the support 
of the pmf, but this is not a problem since there is a natural ambiguity in the choice of thresholds when working with 
such random variables.

We note that when we later come back to trying to make some headway with this recurrence in general we largely treat the 
function $\phi(t)$ as an abstract function, but we do assume that it can be expressed as in the continuous case, we have 
not given any real thought to the discrete case.

<!-- Say something about the non-negativity and continuity assumptions -->


## Carpe rāpa!: optimality and sticking to your guns

It is high time we address on small technical question, must the optimal strategy actually be of the stated form? 
Recall that we have thus for only considered strategies of the form:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}$
</p>

That is, the price we sell at on each given day depends only upon the day itself -- we do not dwell on the past and 
factor in the prices we've seen so far. Since we ought to assume that the buyer only has knowledge of past and not 
future prices, the most general form a strategy could take would be:

<p align="center">
Sell at time $i$ if $P_{i}\geq s_{i}(P_1, \ldots, P_{i-1})$
</p>

where each $s_i$ is a function of the previous $i-1$ prices offered. We note that, regardless of the specific 
distribution of the $P\_i$ we will always have, for any $i$, that

$$
E(S) = E(S|\tau < i)P(\tau < i) + E(S|\tau \geq i)P(\tau \geq i).
$$

by the law of total expectation. As remarked earlier, $E(S\|\tau < i)$, $P(\tau < i)$ and $P(\tau \geq i)$ depend only 
upon $s\_1,\ldots, s\_{i-1}$, whereas $E(S\|\tau \geq i)$ depends upon $s\_i, \ldots, s\_n$. Fortunately, as the 
conditional expectation of $S$ given that $\tau\geq i$ for any such fixed specification of $P\_1,\ldots, P\_{i-1}$ does 
not depend upon the specific choice of these prices, we can happily restrict our attention to those strategies with a 
constant threshold for each day.

## Outstanding questions

Now that we've shown that the optimal thresholds are indeed the 'play on' expectations, and found a rather simply 
looking (albeit non-linear) first order recurrence governing these, a few questions come to mind.

### Other test cases

It's natural to wonder if there are any other reasonably natural distributions for which we can solve, exactly or 
approximately, the first order recurrence governing the optimal threshold.

### Arbitrary turnips

On top of this, it would be great to be able to say something about the solution in general.

## Next time: Asymptotic Swede

In the next post we hope to address both of these questions.

<!-- Add outstanding questions -->

<a name="post2footnote1">1</a> This author doesn't know to what degree people know their models to be correct. It's my 
understanding that the way the prices are generated hasn't changed a great deal for earlier games in the series but I'm 
unsure if at any point people were certain of the model.

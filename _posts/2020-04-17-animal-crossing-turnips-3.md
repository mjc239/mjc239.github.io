---
title: "Animal Crossing Turnip Market -- When to sell?"
excerpt: "Post 3 - Exponentially distributed prices and further asymptotics"
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

# Post 3: Asymptotic Swede

(or is it Turnips?<sup>[1](#myfootnote1)</sup>)

We again return to the question of optimal turnip selling in Animal Crossing. We give a short summary here, but refer the reader to the first two posts, [Turnip Mania](post1hyperlink) and [Non-uniform Turnips](post2hyperlink).

## Turnips 101

Consider the following game -- a simple model for turnip selling in Animal Crossing. Let $X\_1, \ldots, X\_n$ be iid random variables. At each time $t=1, 2, \ldots, n$ the player is offered the opportunity to sell all the turnips they have for a price of $X\_i$. If the player accepts this offer then the game ends and the player ends with a revenue of $X\_i$, if the player refuses then they move to the next timestamp. If the turnips are not sold on or before time $n$ then the turnips spoil and the player walks away with nothing.

We consider strategies of the form:

<p align="center">
Sell at time $i$ if $X_{i}\geq s_{i}$.
</p>

We write $\tilde{s}\_i$ for the expectation maximising choices of these thresholds and $\tilde{e}_n$ for the expected winnings when choosing these optimal thresholds. 



## Last time: Non-uniform Turnips

Last time we considered the special case that the $X\_i$ are iid uniform on $[0,1]$. Having shown in [Turnip Mania](post1hyperlink) that the optimal thresholds satisfy the first order recurrence:

<p align="center">
$\tilde{s}_i = \frac{1}{2}(1 +\tilde{s}_{i + 1}^2)$ for $1\leq i<n$, with $\tilde{s}_n = 0$,
</p>

we found an approximate solution to this non linear recurrence. Very broadly [we showed](post2hyperlink/animal-crossing-turnips/#an-approximate-solution-uniformly-distributed-quotes) that $\tilde{s\_i}\approx 1-\frac{2}{n-i+1}$. 

We then showed that if the $X\_i$ are continuous, then the optimal thresholds still satisfy a first order recurrence, namely:

$$
\tilde{s}_{i} = \tilde{s}_{i+1} + \phi(\tilde{s}_{i+1}).
$$

where $\phi(t) = \int\_t^\infty \bar{F}(x)dx$.

Today we turn our attention to the questions from the end of the last post. That is, we hope to cut our teeth on another distribution in the hope that this might give us some ideas for the general (continuous) case, before having a go at the general case itself.

## An approximate solution: Exponentially distributed quotes

As another test case we consider next the case that $X\_{1}, \ldots, X\_{n}$ are iid $\text{Exp}(\lambda)$. Then, using the recurrence from last time, we see that the optimal threshold values are given by

$$
\tilde{s}_{i} = \tilde{s}_{i + 1} + \lambda^{ - 1}e^{-\lambda \tilde{s}_{i + 1}}, \quad \tilde{s}_{n} = 0.
$$

### Putnam Exam, 2012: B4

As it happens, if we perform the substitution $a\_i = \lambda^{-1}\tilde{s}_{n-i}$, then this becomes

$$
a_{i+1} = a_i + e^{-a_i},
$$

with $a\_0 = 1$.

As it happens, though this is somewhat spoilers, the question of whether the limit of $a\_n - \log n$ exists as $n$ goes to infinity was in fact posed as problem B4 of the 2012 William Lowell Putnam Mathematics Competition. See [here](https://www.youtube.com/watch?v=bFczPxcaYOM) for a video solution by [Michael Penn](https://www.youtube.com/watch?v=bFczPxcaYOM).

### Back to the problem at hand!

Performing the substitution $t\_{i}=e^{\lambda\tilde{s}\_{n-i}}$, we obtain

$$
t_{i+1} = t_{i}e^{1/t_{i}}, \quad t_{0} = 1.
$$

Observe that $1 + x\leq e^x \leq 1 + x + x^2$ for $0\leq x\leq 1$. This follows, for example, from the fact that $(e^x - 1 - x)/x^2$ is increasing for $x\geq 0$. Thus since we clearly have $t\_i\geq 1$ for all $i$, we have

$$
t_{i+1} \geq t_{i} + 1
$$

and

$$
t_{i+1} \leq t_{i} + 1 + 1/t_{i}.
$$

Then, much as before, the first gives $t\_i\geq i + 1$ and the latter $t\_i\leq i + 1 + H\_i$. Putting this all together we see that

$$
t_i = i + O(\log(i+1))
$$

and unfolding gives

$$
\tilde{s}_{i} = \lambda^{-1}\log(n - i + 1) + O\left(\frac{\log(n - i + 1)}{n - i + 1}\right).
$$

In particular we see that

$$
\tilde{s}_0 = \lambda^{-1}\left(1 + O\left(\frac{1}{n}\right)\right)\log{n}.
$$

### Putnam Exam, 2012: B4

It's worth nothing that this shows that $a\_n = (1 + O(\frac{1}{n}))\log{n}$ and so $a\_n - \log n\to 0$ as $n$ goes to infinity.

### Amplification

Much as with the uniform case, we can of course do much better. We in fact have $1+x+\frac{1}{2}x^2\leq e^x\leq 1+x+\frac{1}{2}x^2+x^3$ -- as before, simply because $(e^x - 1 - x-\frac{1}{2}x^2)/x^3$ is increasing for $x\geq 0$. This then translates into telling us that 

$$
t_{i+1} \geq t_{i} + 1 + 1/2t_{i}.
$$

and

$$
t_{i+1} \leq t_{i} + 1 + 1/2t_{i} + 1/t_i^2.
$$

Then, exactly as with it is possible to show

$$
t_i = i + 1 + \frac{1}{2}\log(i+1) + \tau' + o(1),
$$

where $\tau'$ is some absolute constant. Converting this into a somewhat additive statement concerning $\tilde{s}\_i$ we have

$$
\tilde{s}_{i} = \lambda^{-1}\left(\log(n - i + 1) + \frac{\log(n - i + 1)}{2(n - i + 1)} + \frac{\tau'}{n - i + 1} + o\left(\frac{1}{n - i + 1}\right)\right)
$$

as $n-i\to\infty$, and, in particular:

$$
\begin{align}
\tilde{s}_{0} &= \lambda^{-1}\left(\log(n + 1) + \frac{\log(n + 1)}{2(n + 1)} + \frac{\tau'}{n + 1} + o\left(\frac{1}{n + 1}\right)\right)\\
	&= \lambda^{-1}\left(\log n + \frac{\log n}{2n} + \frac{\tau'}{n} + o\left(\frac{1}{n}\right)\right).
\end{align}
$$

### Putnam Exam, 2012: B4

That is, $a\_n -\log n = \frac{\log n}{2n} + \frac{\tau'}{n} + o(\frac{1}{n})$ as $n$ goes to infinity.

<!-- BOOKMARK -->

<!-- Add some remark about how this proof is remarkably similar! -->

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

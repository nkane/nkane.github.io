---
layout: post
Title: "Vector Math Lesson 1: Primer and Basics"
date: 2019-09-01
categories: blog math engineering
visible: 0 
---
In the world of academia the term **_vector_** has a few different meanings. In order to clear up any confusion about the 
term **_vector_**, we will be defining a vector as an object that has both a magnitude and a direction.

# Linear Algebra - Dot Product Geometry: Sign and Orthogonality





```python
# Enabling the `widget` backend.
# This requires jupyter-matplotlib a.k.a. ipympl.
# ipympl can be install via pip or conda.
%matplotlib widget
# aka import ipympl

import matplotlib as mpl
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import matplotlib.pyplot as plt

mpl.rcParams['legend.fontsize'] = 10

fig = plt.figure()
ax = fig.gca(projection='3d')
theta = np.linspace(-4 * np.pi, 4 * np.pi, 100)
z = np.linspace(-2, 2, 100)
r = z**2 + 1
x = r * np.sin(theta)
y = r * np.cos(theta)
ax.plot(x, y, z, label='parametric curve')
ax.legend()

plt.show()
```



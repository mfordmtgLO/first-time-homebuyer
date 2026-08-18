# Mobile Mortgage Chat Debug Record

## 2026-08-18 — Opening greeting visibility

An actual 375×812 mobile browser inspection measured the opened chat panel at `x=12`, `y=128`, `width=359`, and `height=614`, so the fixed panel itself was fully within the viewport below the public header and section navigator. The opening greeting’s transcript viewport measured 355px high but had a `scrollTop` of 49px, hiding the beginning of the 240px greeting card.

The correction keeps the initial single assistant greeting at transcript scroll position 0, with immediate rather than smooth positioning. Later assistant questions preserve the existing focused question-snapping behavior above the response controls.

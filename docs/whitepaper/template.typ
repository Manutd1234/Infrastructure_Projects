// NUSSIF Infrastructure Projects Institutional Whitepaper Template
// Typst 0.15+ Compatible Institutional Layout

#let nussif-navy = rgb("#0a192f")
#let nussif-blue = rgb("#1e3a8a")
#let nussif-gold = rgb("#b45309")
#let nussif-accent = rgb("#2563eb")
#let nussif-border = rgb("#cbd5e1")
#let nussif-bg-subtle = rgb("#f8fafc")
#let nussif-text = rgb("#0f172a")
#let nussif-muted = rgb("#64748b")

#let callout(title: "PROPOSITION", body, color: nussif-blue) = {
  block(
    fill: color.lighten(94%),
    stroke: (left: 3pt + color, rest: 1pt + nussif-border),
    radius: (right: 4pt),
    inset: (x: 12pt, y: 10pt),
    width: 100%,
    outset: 0pt,
    spacing: 12pt,
    [
      #text(weight: "bold", size: 9pt, fill: color, tracking: 0.1em)[#upper(title)] \
      #v(3pt)
      #text(size: 10pt, fill: nussif-text)[#body]
    ]
  )
}

#let statbox(title, value, subtitle, accent: nussif-blue) = {
  rect(
    fill: nussif-bg-subtle,
    stroke: 1pt + nussif-border,
    radius: 4pt,
    inset: 10pt,
    width: 100%,
    [
      #text(size: 8.5pt, weight: "bold", fill: nussif-muted, tracking: 0.05em)[#upper(title)] \
      #v(2pt)
      #text(size: 16pt, weight: "bold", fill: accent)[#value] \
      #v(1pt)
      #text(size: 8.5pt, fill: nussif-muted)[#subtitle]
    ]
  )
}

#let whitepaper(
  title: "NUSSIF Infrastructure Projects",
  subtitle: "High-Throughput Multi-Asset Quantitative Alpha & Operational Infrastructure",
  version: "Version 2.4.0-PROD",
  date: "September 2026",
  classification: "INSTITUTIONAL QUANTITATIVE RESEARCH // RESTRICTED",
  doc,
) = {
  // Page setup
  set page(
    paper: "a4",
    margin: (top: 2.8cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
    header: context {
      let page-num = counter(page).get().first()
      if page-num > 1 [
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [
            #text(size: 8pt, weight: "bold", fill: nussif-navy)[NUSSIF TRADING DESK]
            #text(size: 8pt, fill: nussif-muted)[ · Infrastructure Projects]
          ],
          [
            #text(size: 8pt, fill: nussif-gold, weight: "bold")[#classification]
          ]
        )
        #v(3pt)
        #line(length: 100%, stroke: 0.5pt + nussif-border)
      ]
    },
    footer: context {
      let page-num = counter(page).get().first()
      if page-num > 1 [
        #line(length: 100%, stroke: 0.5pt + nussif-border)
        #v(3pt)
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [
            #text(size: 8pt, fill: nussif-muted)[National University of Singapore Student Investment Fund (NUSSIF)]
          ],
          [
            #text(size: 8pt, weight: "bold", fill: nussif-navy)[Page #counter(page).display("1 of 1", both: true)]
          ]
        )
      ]
    }
  )

  // Typography
  set text(
    font: ("New Computer Modern", "Times New Roman"),
    size: 10.5pt,
    fill: nussif-text,
    lang: "en"
  )
  set par(justify: true, leading: 0.75em)

  // Headings styling
  show heading.where(level: 1): it => block(
    width: 100%,
    below: 14pt,
    above: 20pt,
    [
      #text(fill: nussif-navy, weight: "bold", size: 16pt)[#it.body]
      #v(4pt)
      #line(length: 100%, stroke: 1.5pt + nussif-navy)
    ]
  )

  show heading.where(level: 2): it => block(
    below: 10pt,
    above: 14pt,
    text(fill: nussif-blue, weight: "bold", size: 12.5pt)[#it.body]
  )

  show heading.where(level: 3): it => block(
    below: 8pt,
    above: 11pt,
    text(fill: nussif-gold, weight: "bold", size: 11pt)[#it.body]
  )

  // Code block styling (light institutional theme)
  show raw.where(block: true): it => block(
    fill: rgb("#f8fafc"),
    radius: 4pt,
    inset: (x: 12pt, y: 10pt),
    width: 100%,
    stroke: (left: 3pt + nussif-navy, rest: 0.75pt + rgb("#e2e8f0")),
    text(fill: rgb("#0f172a"), font: "Menlo", size: 8.5pt)[#it]
  )

  show raw.where(block: false): it => box(
    fill: nussif-bg-subtle,
    radius: 2pt,
    outset: (y: 2pt),
    inset: (x: 3pt, y: 0pt),
    stroke: 0.5pt + nussif-border,
    text(fill: nussif-blue, font: "Menlo", size: 9pt)[#it]
  )

  // Tables
  show table: set table(
    stroke: (x, y) => if y == 0 { (bottom: 1.5pt + nussif-navy) } else { 0.5pt + nussif-border },
    fill: (x, y) => if y == 0 { nussif-bg-subtle } else if calc.even(y) { rgb("#ffffff") } else { rgb("#fafafa") },
    inset: (x: 8pt, y: 6pt),
  )

  // --- COVER PAGE ---
  align(center)[
    #v(1.5cm)
    #rect(
      fill: nussif-navy,
      radius: 4pt,
      inset: (x: 16pt, y: 8pt),
      [
        #text(fill: white, size: 10pt, weight: "bold", tracking: 0.15em)[NUSSIF QUANTITATIVE RESEARCH MONOGRAPH]
      ]
    )
    
    #v(1.2cm)
    #text(size: 26pt, weight: "bold", fill: nussif-navy)[#title] \
    #v(0.4cm)
    #text(size: 13pt, fill: nussif-muted, weight: "medium")[#subtitle]
    
    #v(1.2cm)
    #line(length: 40%, stroke: 1.5pt + nussif-gold)
    #v(1.2cm)

    #grid(
      columns: (1fr, 1fr),
      gutter: 20pt,
      align: (center, center),
      [
        #text(size: 9.5pt, weight: "bold", fill: nussif-muted)[PRINCIPAL INVESTIGATOR] \
        #v(2pt)
        #text(size: 11pt, weight: "bold", fill: nussif-navy)[NUSSIF Trading Desk Core Architecture] \
        #text(size: 9pt, fill: nussif-muted)[Quantitative Infrastructure & Risk Engineering]
      ],
      [
        #text(size: 9.5pt, weight: "bold", fill: nussif-muted)[SYSTEM SPECIFICATION] \
        #v(2pt)
        #text(size: 11pt, weight: "bold", fill: nussif-navy)[#version] \
        #text(size: 9pt, fill: nussif-muted)[Date: #date · Singapore]
      ]
    )

    #v(2cm)
    #rect(
      fill: rgb("#fffbeb"),
      stroke: 1pt + rgb("#fde68a"),
      radius: 4pt,
      inset: 12pt,
      width: 90%,
      [
        #text(size: 8.5pt, weight: "bold", fill: nussif-gold, tracking: 0.1em)[SECURITY & DISTRIBUTION NOTICE] \
        #v(4pt)
        #text(size: 8.5pt, fill: rgb("#78350f"))[
          This technical specification describes proprietary alpha generation methodologies, risk decomposition algorithms, lockless ingestion architectures, and AST query sandboxing implemented for NUSSIF operations.
        ]
      ]
    )
  ]

  pagebreak()

  // Outline
  outline(
    title: [Table of Contents],
    indent: 1.5em,
    depth: 3
  )
  pagebreak()

  // Body content
  doc
}

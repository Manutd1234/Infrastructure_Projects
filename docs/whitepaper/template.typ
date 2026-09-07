// Typst template for the NUSSIF institutional whitepaper.
// Provides the `whitepaper` function used by main.typ.

#let whitepaper(
  title: "",
  subtitle: "",
  author: "",
  date: "",
  doc,
) = {
  set page(
    paper: "a4",
    margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
    header: align(right)[
      #text(size: 9pt, fill: gray)[NUSSIF Infrastructure Projects]
    ],
    footer: context [
      #text(size: 9pt, fill: gray)[
        #if counter(page).get().first > 1 [
          #counter(page).display("1 of 1") \ #metadata("title")
        ]
      ]
    ],
  )
  set text(font: "New Computer Modern", size: 11pt, lang: "en")
  set par(justify: true, leading: 0.9em)

  // Title page
  page(margin: (top: 6cm))[
    #align(center)[
      #text(size: 28pt, weight: "bold")[#title]
      #v(0.5cm)
      #text(size: 14pt, fill: gray)[#subtitle]
      #v(2cm)
      #text(size: 12pt)[#author]
      #v(0.3cm)
      #text(size: 10pt, fill: gray)[#date]
    ]
  ]
  pagebreak()

  // Table of contents
  outline(title: [Contents], indent: 1.5em)
  pagebreak()

  // Body
  doc
}

# Bol.com UI Investigation Report

**Date:** 2/10/2026, 12:59:14 PM
**URL:** https://www.bol.com

## Investigation Summary

This report documents the findings from investigating Bol.com's UI for seller information and contact mechanisms.

## Screenshots Taken

1. `01_homepage_2026-02-10T11-59-19-813Z.png`
2. `02_search_results_2026-02-10T11-59-41-834Z.png`
3. `03_product_page_2026-02-10T11-59-46-720Z.png`

## Navigation Flow


### Step 1: Navigate to homepage
- URL: https://www.bol.com/nl/nl/



### Step 2: Perform search
- URL: https://www.bol.com/nl/nl/
- Query: laptop


### Step 3: View product page
- URL: https://www.bol.com/nl/nl/p/little-dutch-little-dutch-monddoekjes-3-stuks-25-x-25-cm/9300000240301451/



## Discovered Selectors

### Search Input
```css
#searchfor
```

### Product Link
```css
a[href*="/p/"]
```

### Seller Information
```css
Not found
```

### Seller Page Link
```css
Not found
```


## Possible Alternative Selectors

Seller info elements found:
- `<DIV class="hidden lg:block lg:text-12 lg:leading-24 lg:text-neutral-text-high lg:bg-neutral-background-low lg:py-1" id="">` - "lekker winkelen zonder zorgenGratis verzending vanaf 25,-Bezorging dezelfde dag, 's avonds of in het"
- `<DIV class="flex items-center relative min-w-[18.25rem] max-w-[76rem] px-4 mx-auto md:px-8" id="">` - "lekker winkelen zonder zorgenGratis verzending vanaf 25,-Bezorging dezelfde dag, 's avonds of in het"
- `<A class="text-brand-text-high no-underline hover:no-underline" id="">` - "lekker winkelen zonder zorgenGratis verzending vanaf 25,-Bezorging dezelfde dag, 's avonds of in het"
- `<SPAN class="" id="">` - "lekker winkelen zonder zorgen"
- `<A class="" id="">` - "Sport, Outdoor & Reizen"
- `<LI class="" id="">` - "Inspiratie uit onze winkels"
- `<SPAN class="appearance-none border-transparent bg-transparent text-neutral-text-high font-bold
    select-none focus:relative focus:outline-none focus:ring-2 focus:ring-brand-background-interactive-default block py-2" id="">` - "Inspiratie uit onze winkels"
- `<LI class="" id="">` - "Shop de look"
- `<A class="appearance-none border-transparent bg-transparent text-neutral-text-high select-none 
      focus:relative focus:outline-none focus:ring-2 focus:ring-brand-background-interactive-default 
      block py-2 no-underline hover:text-brand-text-interactive-hover hover:underline" id="">` - "Shop de look"
- `<DIV class="" id="">` - "Huidige voorraad bijna op bij deze verkoperSelectVoor 23:59 uur besteld, morgen in huis"
- `<DIV class="mr-1 flex-row gap-2 items-center mb-1 flex" id="">` - "Huidige voorraad bijna op bij deze verkoperSelect"
- `<SPAN class="px-[calc(0.5rem-1px)] py-[calc(.25rem-1px)] border-1 border-solid inline-block rounded-1 typography-body-maximal-100 text-accent2-text-high border-accent2-border-high" id="">` - "Huidige voorraad bijna op bij deze verkoper"
- `<SPAN class="typography-body-default-200" id="">` - "Verkoop door bol"
- `<DIV class="" id="">` - "In winkelwagen"
- `<DIV class="flex gap-2 [&_a]:grow [&_a]:md:grow-0 [&>button]:grow [&>button]:md:grow-0" id="">` - "In winkelwagen"
- `<DIV class="contents" id="">` - "In winkelwagen"
- `<A class="box-border relative inline-flex flex-shrink-0 flex-nowrap items-center justify-center h-12 px-[calc(1rem-1px)] typography-body-maximal-200 leading-[calc(3rem-2px)] text-center no-underline whitespace-nowrap align-middle bg-none border-1 border-solid rounded-2 transition-colors ease-in-out duration-150 -webkit-tap-highlight-color-transparent select-none cursor-pointer hover:px-[calc(1rem-2px)] hover:leading-[calc(3rem-4px)] hover:no-underline hover:border-2 focus:px-[calc(1rem-2px)] focus:leading-[calc(3rem-4px)] focus:no-underline focus:border-2 [&:focus:focus-visible]:outline-2 outline-offset-2 [&:focus:focus-visible]:outline-brand-border-interactive-default disabled:bg-neutral-background-interactive-disabled disabled:text-neutral-text-interactive-disabled disabled:border-transparent disabled:pointer-events-none disabled:cursor-default disabled:outline-none aria-disabled:bg-neutral-background-interactive-disabled aria-disabled:text-neutral-text-interactive-disabled aria-disabled:border-transparent aria-disabled:pointer-events-none aria-disabled:cursor-default aria-disabled:outline-none text-neutral-text-dark-onbackground bg-accent1-background-interactive-default border-transparent hover:bg-accent1-background-interactive-hover hover:shadow-2 active:bg-accent1-background-interactive-active active:border-transparent active:text-neutral-text-dark-onbackground" id="">` - "In winkelwagen"
- `<UL class="grid gap-1 [&_em]:not-italic [&_em]:text-accent3-text-high" id="">` - "Gratis verzending door bol vanaf 25 euro
Ophalen bij een bol afhaalpunt mogelijk
30 dagen bedenktijd"
- `<LI class="grid gap-x-2 grid-cols-[theme(size.5)_1fr]" id="">` - "Gratis verzending door bol vanaf 25 euro"
- `<DIV class="col-start-2 typography-body-default-200" id="">` - "Gratis verzending door bol vanaf 25 euro"
- `<DIV class="" id="">` - "Gratis verzending door bol vanaf 25 euro"
- `<P class="" id="">` - "Gratis verzending door bol vanaf 25 euro"
- `<DIV class="" id="">` - "Bezorgoptiesop jouw locatieDoordeweeks ook ’s avonds in huis
Ook zondag in huis (bestel voor za 23:0"
- `<DIV class="" id="">` - "Bezorgoptiesop jouw locatieDoordeweeks ook ’s avonds in huis
Ook zondag in huis (bestel voor za 23:0"
- `<UL class="grid gap-1" id="">` - "Doordeweeks ook ’s avonds in huis
Ook zondag in huis (bestel voor za 23:00)"
- `<LI class="grid gap-x-2 grid-cols-[theme(size.5)_1fr]" id="">` - "Doordeweeks ook ’s avonds in huis"
- `<DIV class="col-start-2 typography-body-default-200" id="">` - "Doordeweeks ook ’s avonds in huis"
- `<DIV class="" id="">` - "Doordeweeks ook ’s avonds in huis"
- `<P class="" id="">` - "Doordeweeks ook ’s avonds in huis"
- `<DIV class="relative box-border flex max-w-full flex-col" id="">` - "Little Dutch Baby Bunny Monddoekjes - 3 Stuks - 25 x 25 cmDe prijs van dit product is 9 euro en 90 c"



### Contact-related elements
- `<A> class="text-neutral-text-high no-underline hover:underline" id=""` - "Contact opnemen" - https://www.bol.com/nl/nl/m/klantenservice




## Security Measures

- **none**: No obvious security measures detected on these pages

## Notes

Investigation completed successfully.

## Recommendations

1. Need to manually identify seller info selector from screenshots.
2. Need to identify seller page navigation manually.
3. Contact options found - investigate these for automation.
4. No obvious security - automation should be straightforward.

---

*Generated by Bol.com Investigation Script*

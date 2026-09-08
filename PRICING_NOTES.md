# Fare model notes

Updated 8 September 2026. These are customer-facing estimates, including 9% VAT, and remain subject to Anjum's availability and confirmation.

## Market anchors

- The Dutch 2026 maximum street-taxi meter is €4.31 start + €3.17/km + €0.52/minute. A 7 km, 15 minute ride is €34.30 at those maximum rates.
- Faircab advertises Amsterdam to Schiphol from €35 and Schiphol to Amsterdam at €55. Its booking tool adds €15 for bookings within 24 hours.
- Other current fixed-fare operators quote approximately €40 from Amsterdam West/South to Schiphol and €50–€55 from central, east, north or IJburg.
- A current competing pre-booked city tariff publishes €2.95 start + €2.17/km + €0.36/minute with a €15 minimum.

## Rates implemented

City and regional ride:

- €4.50 base
- First 10 km: €2.05/km
- Next 20 km: €1.55/km
- Remaining distance: €1.15/km
- €0.34/minute
- €18 minimum

Schiphol transfer:

- €18 base
- First 20 km: €1.15/km
- Next 30 km: €0.85/km
- Remaining distance: €0.60/km
- €0.18/minute
- To Schiphol minimum: €39 for a route below 12 km, otherwise €45
- From Schiphol minimum: €49 for a route below 12 km, otherwise €55

Allowances:

- Pickup in under 24 hours: €7.50 per affected leg
- City pickup between 23:00 and 06:00: €5 per leg
- Weekday city peak periods: €3 per leg
- Pickup over 15 km from central Amsterdam: €0.75 for each excess straight-line kilometre. This protects against unpaid positioning from the home market.
- Return bookings are the sum of the two separately calculated legs.
- The final figure is rounded up to the nearest €0.50.

## Vehicle-cost assumptions

The 2015 Seat Leon ST 1.6 TDI is efficient: published combined figures vary by version from roughly 3.6–4.4 L/100 km. The model should be monitored using a conservative working figure of 5.5 L/100 km for Amsterdam traffic, idling and an older vehicle.

At the CBS national diesel average of €2.326/litre on 31 August 2026, that working consumption costs about €0.128 per driven kilometre in fuel. For profitability reviews, reserve another roughly €0.35–€0.40 per driven kilometre for maintenance and tyres, repairs on an eleven-year-old diesel, depreciation/replacement, taxi insurance, motor tax, cleaning and compliance. A prudent first-pass total is therefore about €0.48–€0.53 per *actual* kilometre, including unpaid pickup and return distance.

Examples before income tax:

| Journey | Website estimate | Conservative operating check |
| --- | ---: | --- |
| 7 km / 15 min Amsterdam ride | €24 incl. VAT | About €22.02 ex VAT; with 12 actual km at €0.50/km, about €16 contribution remains for labour and profit |
| Amsterdam Centraal → Schiphol (OSRM test: 21.1 km / 24 min) | €46.50 incl. VAT | About €42.66 ex VAT; with an empty return, 42.2 actual km at €0.50/km leaves about €21.56 |
| Schiphol → Amsterdam Centraal | €55 incl. VAT | About €50.46 ex VAT; the extra amount helps cover airport pickup and waiting |

The cost reserve is deliberately conservative but cannot guarantee profit because the driver's exact insurance, motor tax, maintenance history, home/base location, annual paid kilometres, parking and empty-running percentage are not known. Replace these assumptions with actual monthly figures after the first 20–30 rides, and review prices whenever fuel or insurance moves materially.

## Sources

- Dutch government taxi tariffs: https://www.rijksoverheid.nl/vraag-en-antwoord/taxi/wat-zijn-de-kosten-voor-een-taxi
- Dutch Tax Administration, 9% VAT on passenger transport: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/personenvervoer
- Faircab: https://faircab.nl/en and https://faircab.nl/taxi-vanaf-schiphol
- Schiphol taxi market comparison: https://www.schipholtaxi.amsterdam/wat-kost-een-schipholtaxi/
- CBS daily fuel prices: https://www.cbs.nl/en-gb/figures/detail/80416ENG
- SEAT/ADAC fuel specification reference: https://www.adac.de/rund-ums-fahrzeug/autokatalog/marken-modelle/seat/leon/5f/247702/

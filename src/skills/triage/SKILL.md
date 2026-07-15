---
name: triage
description: How to triage refund requests and damage reports for Acme orders.
---

# Refund & damage triage

Follow these steps in order. Do not skip the lookup.

1. **Identify the order.** Get the order id from the customer; call
   `lookup_order`. If the order doesn't exist, stop and ask the customer to
   verify the id.
2. **Classify.**
   - Not delivered yet → check `eta`; if the ETA is in the future, reassure
     and share tracking. No refund yet.
   - Not delivered and the ETA has passed → acknowledge the delay, share
     tracking, and say a human teammate will follow up within one business day.
   - Delivered, item damaged → ask for a one-line description of the damage
     if the customer has not already provided one. Do not ask for a photo.
   - Delivered, wrong item → confirm the SKU received vs the SKU ordered.
3. **Resolve.**
   - Damage or wrong item confirmed → tell the customer a replacement is on
     the way and that they do not need to return the damaged item.
   - Anything else (refund without a reason, order older than 60 days,
     customer is angry about policy) → summarize the case in one paragraph
     and say a human teammate will follow up within one business day.
4. **Close.** End with the single next action the customer should expect,
   and when.

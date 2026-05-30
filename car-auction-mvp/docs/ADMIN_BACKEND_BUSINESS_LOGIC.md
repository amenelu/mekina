# Admin Backend Business Logic Guide

This guide explains the backend calculations and decision rules that power admin analytics, dealer analytics, buyer requests, points, messages, offers, and deal completion.

## Marketplace Intelligence

Location: `services/marketplace_intelligence.py`

Most new marketplace scoring logic lives in this service so it can be reused by dealer APIs, buyer request APIs, admin review tools, and future ranking screens.

## Request and Offer Expiry

Location: `services/marketplace_lifecycle.py`

Buyer requests and dealer offers are now soft-expired instead of deleted. This keeps admin history and analytics intact while preventing stale marketplace items from staying actionable.

Lifecycle rules:

- Active buyer requests expire after `30` days by default.
- The expiry window can be changed with the backend environment variable `CAR_REQUEST_EXPIRY_DAYS`.
- Expired buyer requests keep their database row and change `status` from `active` to `expired`.
- Dealer bids expire when their `valid_until` date is in the past.
- Expired dealer bids keep their database row and change `status` from `pending` to `expired`.

What happens after expiry:

- Expired buyer requests are removed from the dealer dashboard active request feed.
- Dealers cannot submit new offers to expired requests.
- Buyers cannot accept expired offers.
- Expired offers still remain visible in historical request detail data, but they are not valid offers.
- Completed requests and accepted deals are not expired by this lifecycle pass.

Where expiry is enforced:

- Dealer dashboard API refreshes expiry before loading active requests.
- Dealer place-offer API refreshes expiry before showing or accepting a bid submission.
- Buyer request detail API refreshes expiry before returning bids and request health.
- Offer acceptance refreshes expiry before creating a deal.
- Admin analytics refreshes expiry before counting active, stale, and risk metrics.

## Buyer Intent Verification

Location: `services/marketplace_growth.py`

Buyer intent verification separates casual requests from stronger marketplace leads.

Data model:

- `request_intent_verifications`
- One verification row per buyer request.

API:

- `GET /requests/api/requests/<request_id>/intent`
- `POST /requests/api/requests/<request_id>/intent`

The buyer or admin can update:

- `contact_confirmed`
- `budget_confirmed`
- `financing_ready`
- `trade_in_ready`
- `purchase_timeline`
- `notes`

Scoring inputs:

- Specific listing requested
- Make/model provided
- Detailed notes
- Uploaded request images
- Contact confirmation
- Budget confirmation
- Financing readiness
- Trade-in readiness
- Purchase timeline

Intent levels:

- `basic`: lower-intent or incomplete request
- `verified`: useful request with enough confirmation
- `high_intent`: strong buyer signal, especially immediate timeline plus confirmed contact/budget

Where it appears:

- Buyer request list payload
- Buyer request detail payload
- Dealer dashboard request cards
- Dealer place-offer request payload
- Admin marketplace health metrics

## Dealer Follow-Up Pipeline

Location: `services/marketplace_growth.py`

The dealer pipeline tracks what should happen after a dealer submits an offer.

Data model:

- `dealer_lead_pipeline`
- One pipeline row per dealer bid.

Stages:

- `offer_sent`
- `buyer_viewed`
- `question_received`
- `follow_up_needed`
- `deal_accepted`
- `deal_completed`
- `lost`

Automatic stage changes:

- New dealer offer creates `offer_sent`.
- Buyer opening request details marks pending offers as `buyer_viewed`.
- Buyer asking a question marks that offer as `question_received`.
- Buyer accepting an offer marks the winning offer `deal_accepted`.
- Competing offers on the accepted request are marked `lost`.
- Buyer/admin completing a deal marks the accepted offer `deal_completed`.

Dealer APIs:

- `GET /dealer/api/pipeline`
- `PUT /dealer/api/pipeline/<bid_id>`

The update API supports:

- `stage`
- `notes`
- `next_follow_up_at`

Admin impact:

- Admin analytics counts pipeline follow-ups that are due.

## Offer Explanation Engine

Location: `services/marketplace_growth.py`

The offer explanation engine turns existing ranking/scoring data into buyer-friendly labels.

It uses:

- Dealer offer ranking
- Offer price position
- Dealer quality score
- Loan availability
- Submitted offer photos
- Mileage
- Offer status

Possible labels include:

- `Best overall value`
- `Strong price`
- `Loan option`
- `Photos included`
- `Reliable dealer`
- `Low mileage`
- `Expired`

Where it appears:

- Buyer request detail offer payloads
- Bid comparison payloads
- Dealer bid API payloads

The frontend can use `primary_label`, `labels`, and `reasons` to explain why an offer is worth attention.

## Dealer Response SLA

Location: `services/marketplace_growth.py`

Dealers can make a response-time commitment. The backend compares that commitment against observed first response time.

Data fields on `user`:

- `response_sla_enabled`
- `response_sla_minutes`

API:

- `GET /dealer/api/sla`
- `PUT /dealer/api/sla`

Valid SLA range:

- Minimum: `30` minutes
- Maximum: `10080` minutes, or `7` days

SLA payload includes:

- `enabled`
- `minutes`
- `label`
- `avg_first_response_minutes`
- `meets_commitment`
- `badge`

If the dealer enabled SLA and their average first response is within the commitment, the backend returns the `Fast responder` badge.

Where it appears:

- Dealer dashboard payload
- Dealer public profile payload
- Dealer API owner payload through `User.to_dict()`
- Admin marketplace health metrics count dealers with enabled SLA

## Second Marketplace Health Pass

This pass added the second half of the backend intelligence layer. The first pass focused on lead quality, dealer quality, dealer/request fit, offer ranking, point economy, and contact-risk detection. The second pass focuses on marketplace operations: whether requests are getting responses, whether offers are still valid, whether a dealer responds well, and whether offer prices are competitive.

The main goal is to help admins and dealers answer operational questions quickly:

- Which buyer requests are not receiving offers?
- Which active requests are going stale?
- Which offers are priced below, near, or above the visible market?
- Which dealers are responsive versus just active?
- Where is marketplace liquidity weak?

New backend functions added in this pass:

- `get_offer_price_position(bid)`
- `get_request_response_health(car_request)`
- `get_request_expiry_risk(car_request)`
- `get_dealer_response_health(dealer)`
- `get_marketplace_health_summary()`

New API surfaces:

- Dealer dashboard request cards now receive `response_health` and `expiry_risk`.
- Dealer place-offer request payload now receives `response_health` and `expiry_risk`.
- Dealer existing bids now receive `price_position`.
- Buyer request detail payload now receives `response_health`, `expiry_risk`, and offer-level `price_position`.
- Bid comparison API now receives offer-level `price_position`.
- Dealer profile API now receives `response_health`.
- Admin analytics now receives a `Marketplace Health` group.

Frontend surfaces added:

- Dealer dashboard shows compact chips for response health and expiry risk.
- Dealer place-offer page shows response health and expiry risk in the customer request panel.
- Dealer place-offer previous-offer cards show market price position.
- Buyer request detail page shows response health, expiry risk, and market position on offer cards.
- Buyer comparison cards show market position.
- Admin analytics shows the new `Marketplace Health` group through the existing analytics page.

Migration added:

- `migrations/versions/d4e5f6a7b8c9_add_marketplace_intelligence_indexes.py`

This migration does not add new business fields. It adds indexes that support the intelligence queries:

- `car_requests(status, created_at)` for active/stale request checks
- `dealer_bid(request_id, status, valid_until)` for valid/expired offer checks
- `dealer_bid(dealer_id, timestamp)` for dealer response/activity checks
- `chat_messages(has_contact_risk)` for moderation/contact-risk counts
- `point_transactions(user_id, created_at)` for point economy summaries

Because this migration adds indexes, production behavior should remain the same after upgrade, but analytics and request-health queries should be easier for SQLite to execute as data grows.

### Score Labels

Scores are clamped between `0` and `100`.

- `High`: score `80+`
- `Medium`: score `50-79`
- `Low`: score below `50`

### Contact Risk Detection

Function: `detect_contact_risk(message)`

Purpose: detect attempts to exchange contact information before a conversation is unlocked.

The backend checks for:

- Ethiopian phone-number-like patterns
- Email addresses
- Links
- Social platform references such as WhatsApp, Telegram, Instagram, Facebook
- Contact phrases such as `call me`, `text me`, `dm me`

When a match is found:

- The visible message replaces contact details with `[Contact Info Hidden]`.
- `has_contact_risk` is set to `true`.
- `contact_risk_categories` stores categories like `phone`, `email`, `link`, `social`.
- `contact_risk_score` is `35 * number_of_matches`, capped at `100`.

Persisted fields:

- `chat_messages.has_contact_risk`
- `chat_messages.contact_risk_score`
- `chat_messages.contact_risk_categories`

Migration:

- `migrations/versions/c9d1e2f3a4b5_add_chat_contact_risk_fields.py`

Admin usage:

- Admin message oversight can identify conversations where users attempted to bypass the platform.
- Admin analytics can count contact-risk messages and contact-risk rate.

## Buyer Request Quality

Function: `get_request_lead_quality(car_request)`

Purpose: estimate how useful and serious a buyer request is for dealers.

Base score: `15`

Positive signals:

- Specific listing requested: `+20`
- Make provided: `+12`
- Model provided: `+12`
- Year preference provided: `+8`
- Mileage preference provided: `+6`
- Detailed notes of at least 20 characters: `+10`
- Uploaded images: `+6` per image, capped at `+18`
- Buyer has completed deals: `+5` per completed deal, capped at `+15`
- Dealers already responding: `+2` per offer, capped at `+10`
- Request is recent, 0-2 days old: `+7`

Negative signals:

- Request is 14+ days old: `-10`

Displayed in:

- Dealer dashboard request cards
- Dealer place-offer page
- Buyer request details as request strength

## Dealer Quality Score

Function: `get_dealer_quality_score(dealer)`

Purpose: summarize dealer reliability and marketplace contribution.

Base score: `35`

Positive signals:

- Active approved listings: `+2` each, capped at `+15`
- Offers submitted: `+1` each, capped at `+12`
- Conversations: `+1` each, capped at `+10`
- Completed deals: `+6` each, capped at `+18`
- Accepted bids: `+2` each, capped at `+10`
- Average rating contributes up to `+15`

Negative signals:

- Unanswered buyer questions: `-3` each, capped at `-12`
- Contact-risk messages: `-5` each, capped at `-15`

Displayed in:

- Dealer public profile
- Dealer profile modal
- Buyer offer cards through offer ranking
- Dealer/request match calculations

## Dealer and Request Match

Function: `get_dealer_request_match(dealer, car_request)`

Purpose: estimate how well a dealer fits a buyer request.

Base score: `10`

Positive signals:

- Dealer has an active listing with matching make: `+25`
- Dealer has an active listing with matching model: `+25`
- Dealer has matching body type for target car: `+10`
- Dealer previously won a similar make: `+10`
- Dealer quality contributes `25%` of the dealer quality score

Displayed in:

- Dealer dashboard request cards
- Dealer place-offer page as `Your fit`

## Dealer Offer Ranking

Function: `rank_dealer_offers(bids)`

Purpose: compare dealer offers on a buyer request using more than price.

Inputs:

- Cash price
- Vehicle year
- Mileage
- Dealer quality
- Whether the offer includes photos
- Whether loan pricing is available

Scoring:

- Lower price: up to `35`
- Newer vehicle year: up to `20`
- Lower mileage: up to `15`
- Dealer quality: `20%` of dealer quality score
- Offer includes images: `+5`
- Loan price available: `+5`

Displayed in:

- Buyer request detail offer cards
- Can be used later to improve comparison ordering or "recommended offer" badges

## Offer Price Position

Function: `get_offer_price_position(bid)`

Purpose: compare a dealer offer against similar marketplace prices.

The backend compares the offer price to:

- Active approved listings with the same make/model
- Other dealer offers with the same make/model

Returned fields:

- `label`: `Below market`, `Near market`, `Above market`, or `No market sample`
- `sample_count`: number of comparable prices used
- `average_price`: average comparable price
- `difference_percent`: percentage difference from the sample average
- `is_below_market`
- `is_above_market`

Thresholds:

- `Below market`: offer is at least `8%` below the average sample price
- `Above market`: offer is at least `12%` above the average sample price
- `Near market`: everything in between

Displayed/exposed in:

- Buyer request detail offers
- Dealer existing bid payloads
- Bid comparison API

## Request Response Health

Function: `get_request_response_health(car_request)`

Purpose: show whether a buyer request is getting enough dealer response.

Calculated fields:

- `offer_count`
- `first_response_minutes`
- `latest_response_at`
- `unanswered_questions`
- `label`
- `reasons`

Labels:

- `Competitive`: request has at least `3` offers
- `Responded`: first dealer response arrived within 24 hours
- `No offers yet`: no dealer has responded
- `Light response`: has responses but not enough to be competitive

Displayed/exposed in:

- Dealer dashboard request cards
- Dealer place-offer request payload
- Buyer request detail payload

## Request Expiry Risk

Function: `get_request_expiry_risk(car_request)`

Purpose: identify active requests that are getting stale or losing useful offers.

Signals:

- Request age
- Whether there are no offers
- Whether all offers have expired
- Days since the last offer
- Number of expired offers

Risk scoring:

- Age contributes up to `35`
- No offers adds `35`
- No valid offers remaining adds `30`
- 7+ days since last offer adds `20`
- Expired offers add up to `10`

Returned fields:

- `score`
- `label`
- `age_days`
- `valid_offer_count`
- `expired_offer_count`
- `days_since_last_offer`
- `reasons`

Admin use:

- Find buyer requests that need dealer attention.
- Identify old requests that should be nudged, expired, or followed up manually.

## Dealer Response Health

Function: `get_dealer_response_health(dealer)`

Purpose: show whether a dealer responds quickly and keeps buyer questions handled.

Signals:

- Average first response time after buyer request creation
- Offers submitted in the last 30 days
- Unanswered buyer questions

Scoring:

- Starts at `45`
- Fast average first response can add up to `30`
- Recent offers add up to `15`
- Unanswered questions subtract up to `30`

Displayed/exposed in:

- Dealer dashboard API
- Dealer public profile API

This is different from dealer quality. Dealer quality is about broad reliability and contribution. Dealer response health is about operational responsiveness.

## Point Economy

Function: `get_point_economy_summary(user)`

Purpose: show how points are being earned and spent.

Calculates:

- Current points from `user.points`
- Earned points from positive `point_transactions.amount`
- Spent points from negative `point_transactions.amount`
- Points spent in the last 30 days

Displayed in:

- Dealer points page
- Rental company points page when routed through the same point request screen

## Dealer Points

Locations:

- Point request API: `routes/dealer.py`
- Admin approval: `routes/admin.py`
- Point transaction model: `models/point_transaction.py`

### Requesting Points

Dealers and rental companies can request more points.

Rules:

- `requested_points` must be a whole number.
- It must be greater than zero.
- A `DealerPointRequest` is created with status `pending`.
- Admins receive a notification.

### Admin Accept / Deny

When accepted:

- All pending requests for that dealer/rental company are summed.
- User points increase by that amount.
- A `PointTransaction` is created with a positive amount.
- The requester receives a notification.

When denied:

- Pending requests are marked denied.
- No points are added.
- The requester receives a notification.

## Offer Costs and Edit Rules

Locations:

- Offer creation: `routes/dealer.py`
- Bid model: `models/dealer_bid.py`

Current core rule:

- Placing an offer costs `1` point.
- Dealer must have at least `1` point.
- After submitting an offer, the dealer can edit for free during the configured free edit window.
- After the free edit window, editing protected/core details can cost points or be blocked depending on endpoint logic.

The frontend shows the edit-window state using fields returned by the dealer bid API:

- `free_edit_expires_at`
- `can_edit_free`
- `free_edit_seconds_remaining`

## Deal Completion and Rewards

Locations:

- Buyer accepts offer: `routes/request.py`
- Deal model: `models/deal.py`
- Reward transaction: `models/point_transaction.py`

### Accepting an Offer

When a buyer accepts a dealer offer:

- The related request is marked completed.
- The accepted bid is linked to the request.
- A `Deal` is created.
- Other pending bids on that request are no longer the accepted path.
- Notifications are sent to relevant parties.

### Completing a Deal

When a deal is marked completed:

- `deal.status` becomes `completed`.
- `deal.completed_at` is set.
- Dealer receives a reward point if not already awarded.
- `deal.reward_points_awarded` is set to `true`.
- `deal.reward_points_amount` stores the reward amount.
- A `PointTransaction` is created with type `closed_deal_reward`.
- Buyer and dealer notifications are emitted.

Current reward:

- `1` point per completed deal

## Dealer Ratings

Locations:

- Normal deal ratings: `routes/request.py`
- Trade-in deal ratings: `routes/tradein.py`
- Rating model: `models/dealer_rating.py`

Rules:

- Buyer can rate a dealer only after a deal is completed.
- Buyer can rate only deals they are part of.
- Dealer rating contributes to dealer quality score.
- Trade-in accepted/completed flows also support buyer ratings.

Reminder logic:

- Buyers can receive reminders if they have completed trade-in offers but have not rated within the expected timeframe.

## Request Detail Score

Locations:

- `routes/request.py`
- `routes/dealer.py`

Function: `calculate_request_score(req)`

Purpose: older request completeness score used by dealer request cards.

Signals include:

- Specific make/model/year
- Budget
- Notes
- Guided-flow preferences
- Image-based request data

This is separate from the newer `lead_quality` score. The older score mostly answers "how complete is the request?" while `lead_quality` answers "how valuable/actionable is this request?"

## Buyer Request Limits

Location: `routes/request.py`

Function: `get_request_limit_status(user_id)`

Rule:

- Buyers can submit up to `3` car requests per 24 hours.

The API returns:

- `limit`
- `used`
- `remaining`
- `can_create_request`
- `message`

The frontend should check this before letting the buyer fill the full questionnaire.

## Trade-In Request Limits

Location: `routes/tradein.py`

Rule:

- Buyers can submit up to `3` trade-in requests per 24 hours.

Trade-in request photos:

- Trade-in sellers are expected to provide at least `10` photos.
- This supports better dealer evaluation and reduces weak trade-in submissions.

## Messaging and Lead Score

Locations:

- Message sending: `routes/main.py`
- Conversation model: `models/conversation.py`
- Lead score model: `models/lead_score.py`

### Free Message Limit

Rule:

- Buyers can send up to `3` messages before the dealer unlocks the chat.
- Dealers can unlock a chat by spending `1` point.
- After unlock, masked original content can be visible to the dealer.

### Conversation Lead Score

The conversation lead score increases when:

- Contact info is attempted: `+30`
- Message contains high-intent words like `cash`, `buy`, `loan`, `test drive`, `appointment`: `+5`
- Message is longer than 40 characters: `+5`
- Buyer replies to dealer within 2 hours: `+10`
- Buyer has favorited the car: `+5`
- Buyer sends the third message within 24 hours: `+20`

Admin usage:

- Helps admins see which chats are high-intent.
- Helps dealers prioritize buyer conversations.

## Admin Analytics

Location: `routes/admin.py`

Function: `_admin_analytics_payload()`

The admin analytics page groups metrics into:

- Users
- Requests & Offers
- Deals
- Points
- Dealer Analytics
- Messages
- Inventory
- Trade-ins

### User Metrics

Counts:

- Total users
- Buyers
- Dealers
- Rental companies
- Admins

### Request and Offer Metrics

Counts:

- Requests sent
- Active requests
- Completed requests
- Dealer offers
- Accepted offers
- Offer acceptance rate

Breakdowns:

- General requests
- Specific-car requests
- Image-based requests
- Top requested makes

### Deal Metrics

Counts/calculations:

- Deals accepted
- Deals completed
- Completion rate
- Total deal value
- Average deal value
- Reward points awarded

Breakdown:

- Top closing dealers by completed deals and deal value

### Point Metrics

Counts/calculations:

- Live point balances
- Points added
- Points spent
- Pending point requests
- Pending requested points
- Approved / denied request counts

Breakdown:

- Point transaction types
- Dealers requesting the most points
- Dealers spending the most points

### Dealer Activity Score

Admin dealer activity score is different from dealer quality score.

Formula:

```text
activity_score =
  offers_submitted
  + active_listings
  + completed_deals * 3
  + conversations
```

Purpose:

- Tracks how active a dealer is on the platform.
- Used in admin analytics and dealer cards.

This is intentionally simple so admins can audit the number easily.

### Message Metrics

Counts/calculations:

- Conversations
- Unlocked conversations
- Unlock rate
- Messages sent
- Masked/contact-risk messages
- Contact-risk rate

### Marketplace Health Metrics

Function: `get_marketplace_health_summary()`

Admin analytics now also expose:

- Active requests
- Requests with no offers
- Stale active requests
- High expiry-risk requests
- Average offers per active request
- Contact-risk messages

Purpose:

- Show where marketplace liquidity is weak.
- Help admins decide when to nudge dealers, expire old requests, or investigate contact-sharing behavior.

### Inventory Metrics

Counts:

- Total listings
- Active listings
- Pending approval
- Featured listings
- For sale
- For rent

Breakdowns:

- Body type
- Drivetrain

## Dealer Analytics

Location: `routes/dealer.py`

Dealer analytics include:

- Popular requested makes/models
- Popular search terms
- Most-liked cars
- Inventory performance
- Win rate
- Market win rate
- Demand trends
- Body type demand
- Drivetrain demand

Advanced analytics can be gated by dealer point spending thresholds through `User.get_analytics_status()`.

## Search Logic

Location: `routes/main.py`

Search normalizes spaces and casing.

The backend checks terms against:

- Make
- Model
- Year
- Condition
- Body type
- Drivetrain
- Fuel type
- Mileage
- Electric range

This supports searches that are not affected by capitalization or extra spaces.

## Admin Password Reset Logic

Location: `routes/admin.py`

The system uses admin-assisted password reset instead of email reset.

Flow:

- Admin opens a user record.
- Admin generates a temporary password.
- Backend hashes and stores the temporary password.
- Admin shares it with the user through an external trusted channel.
- User logs in and should change their password from profile.

## Deployment Reminder

When backend models or migrations change:

1. Pull latest backend code on PythonAnywhere.
2. Run:

```bash
flask db upgrade
```

3. Reload the PythonAnywhere web app.
4. Confirm live API payloads include the new fields before testing the Cloudflare frontend.

For the current marketplace intelligence update, confirm:

- Dealer profile API includes `dealer_quality`.
- Dealer dashboard API includes `lead_quality`, `dealer_match`, and `point_economy`.
- Request detail API includes `lead_quality` and `offer_rank`.
- Admin message APIs include `has_contact_risk`, `contact_risk_score`, and `contact_risk_categories`.

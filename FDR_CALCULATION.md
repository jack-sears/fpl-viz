# Fixture Difficulty Rating (FDR) Calculation

## Overview
The FDR system calculates two separate difficulty ratings for each fixture:
- **Attack Difficulty**: How hard it is for your team's attackers to score (1-5 scale)
- **Defense Difficulty**: How hard it is for your team's defenders/GK to keep a clean sheet (1-5 scale)

## Step-by-Step Calculation

### 1. Team Strength Calculation
For each team, we calculate from Understat match data:
- **xG/90**: Expected goals per 90 minutes (attacking strength)
- **xGA/90**: Expected goals conceded per 90 minutes (defensive strength)
- **GF/90**: Actual goals scored per 90 minutes
- **GA/90**: Actual goals conceded per 90 minutes
- **Home/Away splits**: Separate xG/xGA/GF/GA for home and away matches
- **Home/Away bonuses**: Team-specific differences (xG_home - xG_overall, xGA_overall - xGA_home)
- **Form factor**: Rolling xG difference over last 5 matches = average(xG - xGA)

### 2. Combined Attack/Defense Ratings
We combine xG with actual goals (GF) and xGA with actual goals conceded (GA):

**Attack Rating** = α × xG + (1-α) × GF
- α = 0.7 (xG weighted more heavily as it's more predictive)
- Example: If team has 1.8 xG/90 and 2.0 GF/90, Attack Rating = 0.7×1.8 + 0.3×2.0 = 1.86

**Defense Rating** = β × xGA + (1-β) × GA
- β = 0.7 (xGA weighted more heavily)
- Example: If team has 1.2 xGA/90 and 1.0 GA/90, Defense Rating = 0.7×1.2 + 0.3×1.0 = 1.14

### 3. Attack Difficulty Calculation
**Attack Difficulty** = How hard it is to score against the opponent

```
1. Get opponent's combined defense rating (based on venue):
   - If we're home: opponent's away defense rating
   - If we're away: opponent's home defense rating
   
   opponentDefenseRating = β × opponentXGA + (1-β) × opponentGA

2. Scale to 0-100 range (inverted for defense - lower is better):
   defenseRatingScaled = scaleTo100Inverted(opponentDefenseRating, minDefense, maxDefense)
   - Lower defense rating = better defense = higher difficulty

3. Get opponent's combined attack rating (for context):
   opponentAttackRating = α × opponentXG + (1-α) × opponentGF
   attackRatingScaled = scaleTo100(opponentAttackRating, minAttack, maxAttack)

4. Calculate home/away factor:
   - If we're home: use opponent's home defense bonus (negative = easier for us)
   - If we're away: use opponent's home attack bonus (negative = easier for us)
   homeAwayFactorScaled = 50 + (homeAwayBonus × 20)  // Centered at 50, scaled to 0-100

5. Calculate form factor:
   formFactorScaled = scaleTo100(opponentFormFactor, minForm, maxForm)
   - Form factor = average(xG - xGA) over last 5 matches

6. Final calculation (weights: 0.45 + 0.45 + 0.05 + 0.05):
   attackDifficultyRaw = 
     (defenseRatingScaled × 0.45) +      // Opponent's defense (primary)
     (attackRatingScaled × 0.45) +        // Opponent's attack (context)
     (homeAwayFactorScaled × 0.05) +     // Home/away bonus
     (formFactorScaled × 0.05)           // Recent form

7. Convert to 1-5 scale:
   - 0-20: 1 (Very Easy)
   - 20-40: 2 (Easy)
   - 40-60: 3 (Medium)
   - 60-80: 4 (Hard)
   - 80-100: 5 (Very Hard)
```

### 4. Defense Difficulty Calculation
**Defense Difficulty** = How hard it is to keep a clean sheet

```
1. Get opponent's combined attack rating (based on venue):
   - If we're home: opponent's away attack rating
   - If we're away: opponent's home attack rating
   
   opponentAttackRating = α × opponentXG + (1-α) × opponentGF

2. Scale to 0-100 range:
   attackRatingScaled = scaleTo100(opponentAttackRating, minAttack, maxAttack)
   - Higher attack rating = better attack = higher difficulty

3. Get opponent's combined defense rating (for context):
   opponentDefenseRating = β × opponentXGA + (1-β) × opponentGA
   defenseRatingScaled = scaleTo100Inverted(opponentDefenseRating, minDefense, maxDefense)

4. Calculate home/away and form factors (same as attack difficulty)

5. Final calculation (same weights):
   defenseDifficultyRaw =
     (attackRatingScaled × 0.45) +      // Opponent's attack (primary)
     (defenseRatingScaled × 0.45) +      // Opponent's defense (context)
     (homeAwayFactorScaled × 0.05) +    // Home/away bonus
     (formFactorScaled × 0.05)          // Recent form

6. Convert to 1-5 scale (same as attack)
```

## Example

**Arsenal vs Manchester City (Arsenal at Home)**

1. **Attack Difficulty**:
   - Man City's away defense rating = 0.7×0.8 + 0.3×0.9 = 0.83 (excellent defense)
   - Scaled rating = 90 (very hard to score)
   - Man City's away attack rating = 0.7×2.1 + 0.3×2.3 = 2.16 (for context)
   - Scaled attack rating = 85
   - Home/away factor = 50 + (Man City's home defense bonus × 20) = 45
   - Form factor = 0.5 (scaled to 60)
   - Final: (90×0.45) + (85×0.45) + (45×0.05) + (60×0.05) = 40.5 + 38.25 + 2.25 + 3 = 84
   - **Result: 5 (Very Hard)**

2. **Defense Difficulty**:
   - Man City's away attack rating = 2.16 (excellent attack)
   - Scaled rating = 95 (very hard to defend)
   - Man City's away defense rating = 0.83 (for context)
   - Scaled defense rating = 90
   - Same home/away and form factors
   - Final: (95×0.45) + (90×0.45) + (45×0.05) + (60×0.05) = 42.75 + 40.5 + 2.25 + 3 = 88.5
   - **Result: 5 (Very Hard)**

## Key Points

- **Combined ratings**: Uses both xG/xGA (predictive) and GF/GA (actual) with 70/30 weighting
- **Team-specific home/away bonuses**: Each team has different home advantage
- **Form factor**: Rolling xG difference captures recent momentum
- **Weight distribution**: 45% primary rating + 45% context + 5% home/away + 5% form
- **Lower defense rating = Better defense = Higher attack difficulty**
- **Higher attack rating = Better attack = Higher defense difficulty**

## Parameters

- **α (Alpha)**: 0.7 - Weight for xG vs GF in attack rating
- **β (Beta)**: 0.7 - Weight for xGA vs GA in defense rating
- **Primary rating weight**: 0.45 (45%)
- **Context rating weight**: 0.45 (45%)
- **Home/away factor weight**: 0.05 (5%)
- **Form factor weight**: 0.05 (5%)

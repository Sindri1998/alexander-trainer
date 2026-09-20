// ============================================================================
//  SCENARIO TRAINING — CONTENT FILE
//  Alexander Machine Shop · General machining theory & shop troubleshooting
// ============================================================================
//
//  This file is DATA ONLY. No component logic lives here. You can add, edit,
//  or remove scenarios in this file without touching anything else.
//
//  HOW TO ADD A SCENARIO
//  ---------------------
//  1. Copy the TEMPLATE block below (between the /* ... */ markers).
//  2. Paste it at the bottom of the SCENARIOS array, before the closing ];
//  3. Fill in each field. Rules:
//       id          -> unique short string. Convention: category prefix + number,
//                      e.g. "sf-06" for the 6th Speeds & Feeds scenario.
//                      Progress is saved against this id, so don't reuse or
//                      rename ids once people have played them.
//       category    -> must be one of the ids in CATEGORIES (below).
//       difficulty  -> 1, 2, or 3.  Best answer pays 10 XP x difficulty.
//       situation   -> the story. What's the job, what's going wrong. Plain
//                      text; \n for a line break if you need one.
//       options     -> 4 or 5 choices. EXACTLY ONE must have result: "best".
//                      Include at least one "partial" (not wrong, but not the
//                      root cause) and at least one "bad" (wrong or unsafe).
//                        result: "best"    -> full XP, keeps streak
//                        result: "partial" -> half XP, ends streak
//                        result: "bad"     -> no XP, ends streak
//                      Every option needs feedback text explaining why.
//       whyItMatters-> optional. Shown after they answer. Delete the line if
//                      you don't want one.
//  4. Save. The app validates this file on load and will log a clear error
//     in the browser console (F12) if a scenario is missing a "best" answer,
//     has a bad category, etc.
//
//  Options are shuffled every time a scenario is shown, so the order you
//  write them in doesn't matter and "best" doesn't have to be first.
//
//  Units: inch shop. SFM = surface feet per minute, IPR = inches per rev,
//  DOC = depth of cut.
//
// ============================================================================

/* ── TEMPLATE — copy from here ─────────────────────────────────────────────
  {
    id: "xx-99",
    category: "speeds-feeds",
    difficulty: 2,
    situation:
      "Describe the job, the material, what's running, and what problem showed up.",
    options: [
      { text: "The best fix / correct diagnosis.",
        result: "best",
        feedback: "Why this is the root cause and the right call." },
      { text: "Something reasonable that treats a symptom, not the cause.",
        result: "partial",
        feedback: "Why this helps a little but doesn't solve it." },
      { text: "Another plausible-but-wrong option.",
        result: "bad",
        feedback: "Why this won't work or makes it worse." },
      { text: "The clearly bad or unsafe option.",
        result: "bad",
        feedback: "Why this is dangerous or wrong." },
    ],
    whyItMatters: "One or two sentences on the underlying principle.",
  },
── end template ──────────────────────────────────────────────────────────── */


// ─── CATEGORIES ─────────────────────────────────────────────────────────────
// id     -> used in each scenario's `category` field
// label  -> shown in the UI and used as the badge name (badges are named after
//           the skill, never after a seniority tier)
// color  -> accent color for the category chip
export const CATEGORIES = [
  { id: "speeds-feeds",  label: "Speeds & Feeds",         color: "#3b82f6" },
  { id: "tool-wear",     label: "Tool Wear & Tool Life",  color: "#f59e0b" },
  { id: "workholding",   label: "Workholding & Setup",    color: "#8b5cf6" },
  { id: "bar-work",      label: "Bar Feeding & Bar Work", color: "#06b6d4" },
  { id: "material",      label: "Material Behavior",      color: "#ec4899" },
  { id: "finish-chatter",label: "Finish & Chatter",       color: "#10b981" },
  { id: "dimensional",   label: "Dimensional & Inspection", color: "#f97316" },
  { id: "coolant-chips", label: "Coolant & Chip Control", color: "#14b8a6" },
  { id: "safety",        label: "Safety Judgment",        color: "#ef4444" },
];


// ─── SCENARIOS ──────────────────────────────────────────────────────────────
export const SCENARIOS = [

  // ==========================================================================
  //  SPEEDS & FEEDS  (sf-)
  // ==========================================================================
  {
    id: "sf-01",
    category: "speeds-feeds",
    difficulty: 1,
    situation:
      "Roughing 4140 pre-hard on the lathe with a CNMG carbide insert. The chips coming off are long, stringy, and blue-hot, wrapping around the part and the toolholder. Finish looks OK. No alarms.",
    options: [
      { text: "Increase the feed rate (IPR) so the chip gets thicker and breaks.",
        result: "best",
        feedback: "Stringy chips on carbide almost always mean the chip is too thin for the insert's chipbreaker to work. A heavier feed thickens the chip so it curls and snaps. Heat leaves with the chip instead of staying in the part." },
      { text: "Reduce the spindle speed to cool the chips down.",
        result: "partial",
        feedback: "Lower SFM will cool things somewhat, but the chip is still too thin to break. You'd be running slower AND still fighting stringers. Fix the chip thickness first." },
      { text: "Turn the coolant pressure up to blast the chips away.",
        result: "bad",
        feedback: "Coolant can't fix chip formation. A stringy chip is a geometry/feed problem, not a flushing problem, and stringers will still wrap the part." },
      { text: "Stop the cycle and pull the stringers off by hand while the spindle is running down.",
        result: "bad",
        feedback: "Never reach for chips near a rotating spindle. Hot stringy chips are razor sharp and can wrap a hand. Stop the machine fully, then clear with pliers or a hook." },
    ],
    whyItMatters: "Chip thickness is set by feed per rev, not speed. Carbide chipbreakers need a minimum chip load to work. Running too light of a feed is one of the most common causes of poor chip control and short tool life.",
  },
  {
    id: "sf-02",
    category: "speeds-feeds",
    difficulty: 2,
    situation:
      "A finishing pass on 304 stainless is leaving a glazed, smeared surface with tiny tears. The insert is a sharp, polished finishing grade. You're running a very light DOC (0.005\") and a light feed (0.002 IPR) hoping for a nice finish.",
    options: [
      { text: "Increase DOC and feed so the edge actually cuts instead of rubbing.",
        result: "best",
        feedback: "Every cutting edge has a hone radius. When DOC and chip thickness drop below that radius the tool plows and rubs instead of shearing. Stainless work-hardens under rubbing, giving exactly this smeared, torn look. Take a real chip." },
      { text: "Slow the spindle down to reduce heat.",
        result: "partial",
        feedback: "Lower SFM reduces heat, but the tool is still rubbing rather than cutting. The tearing will continue until the chip load exceeds the edge hone." },
      { text: "Switch to an even lighter feed for a smoother finish.",
        result: "bad",
        feedback: "This makes it worse. You're already below the minimum chip thickness. Going lighter means more rubbing, more work hardening, and faster edge breakdown." },
      { text: "Run it dry so you can see the chip.",
        result: "bad",
        feedback: "Stainless needs coolant to control heat and prevent built-up edge. Running dry to observe doesn't diagnose anything and will damage the insert." },
    ],
    whyItMatters: "Too light of a cut is a real failure mode, especially on gummy materials. A finishing pass still needs enough DOC and feed to shear cleanly past the edge hone.",
  },
  {
    id: "sf-03",
    category: "speeds-feeds",
    difficulty: 2,
    situation:
      "Facing a 6\" diameter 1018 steel part with G96 constant surface speed. As the tool approaches center the spindle winds up hard, then at the last 0.100\" of diameter it screams, leaves a raised nub at center, and the insert nose chips.",
    options: [
      { text: "Add a maximum spindle speed clamp before the G96 call so RPM can't run away near center.",
        result: "best",
        feedback: "In constant surface speed mode, RPM climbs as diameter shrinks and heads toward infinity at X0. A speed clamp (G50 S____ on Fanuc, but the principle is control-independent) caps it. Without one, the machine hits max RPM, vibration spikes, and the tool gets hammered at center." },
      { text: "Face only to X0.100 and leave the nub for the next op.",
        result: "partial",
        feedback: "You've avoided the symptom, but you now have an extra op or a nub that may not be acceptable. The real fix is a speed clamp so you can face across center cleanly." },
      { text: "Switch the whole facing pass to a fixed low RPM (G97).",
        result: "partial",
        feedback: "This works safely, but you give up constant surface speed across the whole 6\" face. The outer diameter will run far below optimal SFM and finish and tool life suffer out there. A clamp gives you both." },
      { text: "Increase the feed rate near center to get through it faster.",
        result: "bad",
        feedback: "A heavier feed at runaway RPM just loads the tool harder at the worst possible moment. It doesn't address the speed spike at all." },
    ],
    whyItMatters: "Constant surface speed is great on diameters, but it must always be clamped. Understanding why RPM runs away toward center applies to every CNC lathe regardless of control brand.",
  },
  {
    id: "sf-04",
    category: "speeds-feeds",
    difficulty: 3,
    situation:
      "You're drilling a 0.375\" hole 2.5\" deep in 4140 with a solid carbide coolant-through drill. The first 20 parts were fine. The drill then snapped at full depth with no warning. Chips before failure had gotten short, thick, and dark.",
    options: [
      { text: "The feed was too heavy for this depth; chips packed the flutes. Reduce IPR and confirm through-coolant is actually flowing.",
        result: "best",
        feedback: "Short thick chips that go dark mean the flutes were clogging and heat was building. At 6.7x diameter deep, chips must evacuate freely. Thick chips from a heavy feed jam and the drill twists off. Check the coolant path too: a blocked through-coolant port will kill a drill the same way." },
      { text: "The drill was just worn out after 20 parts; replace it and keep the same parameters.",
        result: "partial",
        feedback: "Replacing it gets you running, but 20 parts is not normal life for a carbide drill in 4140. If you don't change anything, the next one will do the same thing." },
      { text: "Increase spindle speed so the drill spends less time in the cut.",
        result: "bad",
        feedback: "More SFM adds heat to a hole that's already packing chips. It shortens tool life and does nothing about evacuation." },
      { text: "Add a peck cycle with a full retract every 0.050\".",
        result: "partial",
        feedback: "Pecking clears chips, but a coolant-through carbide drill is designed to run without pecking, and retracting every 0.050\" will multiply your cycle time. Pecking also re-enters the cut repeatedly, which is hard on carbide. Fix the chip and coolant first; peck only if you must." },
    ],
    whyItMatters: "Deep-hole drilling lives or dies on chip evacuation. Chip color and shape tell you what's happening in the hole before the tool does.",
  },
  {
    id: "sf-05",
    category: "speeds-feeds",
    difficulty: 3,
    situation:
      "Threading a 1\"-8 UN external thread in 4140 with a laydown carbide insert. The thread flanks come out rough and torn on the last two passes, and the insert is showing a chip on the nose. The threading cycle uses equal depth per pass.",
    options: [
      { text: "Change the infeed to decreasing depth per pass (constant chip area) so the final passes take less material.",
        result: "best",
        feedback: "With equal depth per pass, the chip gets wider and heavier every pass because the thread flank is getting longer. The last passes take the biggest bite when the insert is weakest at the tip. Decreasing infeed keeps chip area roughly constant. Most threading cycles have a setting for this." },
      { text: "Add a spring pass at the final depth.",
        result: "partial",
        feedback: "A spring pass cleans up the flanks somewhat, but the insert is already chipping from the heavy final passes. It doesn't fix the root cause." },
      { text: "Slow the spindle way down so the insert has an easier time.",
        result: "partial",
        feedback: "Lower speed reduces heat, but the problem is the chip load on the last passes, not speed. You'd be threading slowly and still tearing." },
      { text: "Increase the number of passes but keep equal depth per pass.",
        result: "bad",
        feedback: "More equal-depth passes means the LAST pass still takes the largest chip area. You've added cycle time without changing what's breaking the insert." },
    ],
    whyItMatters: "Thread chip area grows with each pass because the flank gets longer. Infeed strategy is the single biggest factor in thread finish and insert life.",
  },

  // ==========================================================================
  //  TOOL WEAR & TOOL LIFE  (tw-)
  // ==========================================================================
  {
    id: "tw-01",
    category: "tool-wear",
    difficulty: 1,
    situation:
      "Checking a roughing insert after 40 parts in 1045 steel. There's an even, gray, polished wear land about 0.012\" wide along the flank below the cutting edge. No chipping, no cratering. Parts are still in tolerance but the finish is getting a little duller.",
    options: [
      { text: "Normal flank wear. Index the insert now, before it fails, and note 40 parts as a reasonable tool life for this job.",
        result: "best",
        feedback: "Even flank wear is the healthy, predictable failure mode. It means speed and feed are in the right neighborhood. Around 0.012 to 0.015\" of flank wear is a typical change point; run it further and you risk sudden failure and a scrapped part." },
      { text: "Keep running it until parts go out of tolerance, then index.",
        result: "partial",
        feedback: "You'll get a few more parts, but flank wear accelerates near the end and can turn into edge failure in the middle of a cut. Changing on a predictable count is safer than waiting for the scrap part to tell you." },
      { text: "Reduce the speed by 30% so this insert lasts longer.",
        result: "bad",
        feedback: "Even flank wear at 40 parts is good performance, not a problem. Slowing down costs cycle time on every part for no reason." },
      { text: "Switch to a tougher, less wear-resistant grade.",
        result: "bad",
        feedback: "A tougher grade is for chipping and interrupted cuts. For gradual flank wear you'd want more wear resistance, not less. And this wear pattern is normal anyway." },
    ],
    whyItMatters: "Learn to read wear patterns. Uniform flank wear = good parameters, predictable life. Anything else (chipping, cratering, notching, built-up edge) is telling you something is wrong.",
  },
  {
    id: "tw-02",
    category: "tool-wear",
    difficulty: 2,
    situation:
      "Turning 6061 aluminum with an uncoated carbide insert. After a few parts the cutting edge has a lump of aluminum welded to it. Finish has gone from shiny to dull and scratchy. Chips are coming off in clumps instead of curls.",
    options: [
      { text: "Built-up edge. Increase the SFM and make sure coolant is hitting the edge; consider a sharper, polished insert.",
        result: "best",
        feedback: "Built-up edge forms when the material is soft and gummy and the speed is too low, so material sticks and welds to the edge instead of sliding off. Aluminum wants high SFM, a very sharp polished edge, and good lubrication. More speed usually cures it." },
      { text: "Scrape the lump off with a file and keep running the same parameters.",
        result: "partial",
        feedback: "Clearing the edge gets you a few good parts, but the built-up edge will come right back because the conditions that formed it haven't changed." },
      { text: "Slow the spindle down; the aluminum is getting too hot and sticking.",
        result: "bad",
        feedback: "Backwards. Built-up edge in aluminum is a LOW speed problem. Slowing down makes it worse." },
      { text: "Increase the feed to push the chip past the edge.",
        result: "bad",
        feedback: "A heavier feed on a gummed-up edge just tears the surface more. It doesn't stop the welding." },
    ],
    whyItMatters: "Built-up edge is the opposite of most wear problems: the fix is usually MORE speed, not less. Recognizing the welded lump saves a lot of wasted troubleshooting.",
  },
  {
    id: "tw-03",
    category: "tool-wear",
    difficulty: 2,
    situation:
      "Roughing hot-rolled 1018 bar with a heavy scale on the OD. Inserts are chipping along the edge after only 5 or 6 parts. Flank wear is minimal otherwise. You're already using a medium-tough grade.",
    options: [
      { text: "Increase DOC on the first pass so the cutting edge gets under the scale instead of riding in it.",
        result: "best",
        feedback: "Mill scale is abrasive and hard. If the first pass DOC is shallow, the edge is cutting right in the scale layer and gets hammered. Take a deep enough first cut that the edge is in clean steel below the scale. This is a depth problem, not a grade problem." },
      { text: "Switch to a tougher grade insert.",
        result: "partial",
        feedback: "A tougher grade resists chipping and might get you a few more parts, but you're still cutting in the scale. Fix the DOC first, then choose grade." },
      { text: "Lower the feed rate to be gentler on the edge.",
        result: "bad",
        feedback: "Lighter feed keeps more of the edge in the scale for longer. It usually makes the chipping worse." },
      { text: "Increase spindle speed to cut through the scale faster.",
        result: "bad",
        feedback: "Scale is abrasive; more speed just means more abrasive contact per minute and shorter life." },
    ],
    whyItMatters: "Chipping with little flank wear points at impact or hard-spot loading, not normal abrasion. On scaly or cast material, get the edge below the skin on the first pass.",
  },
  {
    id: "tw-04",
    category: "tool-wear",
    difficulty: 3,
    situation:
      "Turning a 17-4 stainless shaft. The insert shows a deep notch worn right at the depth-of-cut line, while the rest of the edge looks fine. Parts show a slight step at the shoulder where the notch is.",
    options: [
      { text: "Depth-of-cut notching. Vary the DOC pass to pass so the notch doesn't form at one spot, and consider a tougher grade or a lead-angle change.",
        result: "best",
        feedback: "Notch wear at the DOC line happens on work-hardening materials. The previous pass leaves a hardened skin, and the edge at the DOC line keeps hitting that same hardened band. Varying DOC spreads the wear. Changing the lead angle also spreads the load along more of the edge." },
      { text: "Index to a fresh edge and keep the same DOC.",
        result: "partial",
        feedback: "The fresh edge will notch in the same spot for the same reason. It's a temporary fix." },
      { text: "Increase the speed to burn through the hard skin.",
        result: "bad",
        feedback: "Higher SFM on 17-4 accelerates wear everywhere and adds heat, which encourages more work hardening. Wrong direction." },
      { text: "Take one very light finishing pass to remove the step.",
        result: "bad",
        feedback: "A light pass on a work-hardened skin is exactly how you make it harder. It won't fix the notching and may glaze the surface." },
    ],
    whyItMatters: "DOC notching is specific to work-hardening alloys. If you see wear concentrated at one spot on the edge, ask what that spot is hitting that the rest of the edge isn't.",
  },
  {
    id: "tw-05",
    category: "tool-wear",
    difficulty: 3,
    situation:
      "Running a long production job in 4140. Tool life has been consistent at about 60 parts per edge. Suddenly a new box of the same insert only lasts 25 parts with heavy crater wear on the rake face. Nothing else in the process changed.",
    options: [
      { text: "Check the new box against the old: grade, coating, and part number. Then confirm the material cert on the current bar lot.",
        result: "best",
        feedback: "When tool life halves overnight and you changed nothing, something changed that you didn't do. Either the insert isn't what you think (wrong grade, wrong coating, counterfeit) or the material lot is harder or has different chemistry. Crater wear is a heat/chemistry signature. Verify both before touching parameters." },
      { text: "Slow the SFM by 20% to compensate.",
        result: "partial",
        feedback: "This will likely stretch life on the current inserts, but you're masking a supply problem. If it's a wrong insert or a hard bar lot, you want to know that." },
      { text: "Increase coolant concentration to reduce heat.",
        result: "bad",
        feedback: "Concentration didn't change and wasn't the cause. Adjusting it blindly introduces another variable." },
      { text: "The first 60-part life was probably a fluke; accept 25 as the new normal.",
        result: "bad",
        feedback: "Consistent life over a long run isn't a fluke. Accepting a 60% drop without investigation costs money on every part." },
    ],
    whyItMatters: "Sudden tool life changes with no process change point to an input change: tooling lot, material lot, coolant condition. Chase the input before changing parameters.",
  },

  // ==========================================================================
  //  WORKHOLDING & SETUP  (wh-)
  // ==========================================================================
  {
    id: "wh-01",
    category: "workholding",
    difficulty: 1,
    situation:
      "Turning a 1.5\" OD by 8\" long steel shaft held only in the chuck, no tailstock. The diameter is 0.004\" bigger at the free end than at the chuck. The tool is sharp and the program is a straight cut.",
    options: [
      { text: "Part deflection. Support the free end with a tailstock center or tailstock chuck.",
        result: "best",
        feedback: "An 8\" part at 1.5\" diameter is over 5:1 length to diameter. Cutting force pushes the free end away from the tool, so it cuts less and stays bigger. Supporting the end is the real fix." },
      { text: "Reduce DOC and feed for the finish pass to lower cutting force.",
        result: "partial",
        feedback: "Lighter cuts reduce deflection but don't remove it, and the taper will come back with any tool wear. Support the part." },
      { text: "Add a taper compensation in the program to cut more at the free end.",
        result: "partial",
        feedback: "Programming around deflection works only as long as everything stays identical. Change the insert, the DOC, or the material lot and the taper changes. It's a band-aid." },
      { text: "Tighten the chuck harder to stiffen the part.",
        result: "bad",
        feedback: "Chuck pressure has nothing to do with the free end bending. Excess pressure can distort the gripped end and doesn't help the cantilever at all." },
    ],
    whyItMatters: "Taper that grows toward the free end is the classic signature of part deflection. Rule of thumb: past 3 or 4 times diameter in length, think about support.",
  },
  {
    id: "wh-02",
    category: "workholding",
    difficulty: 2,
    situation:
      "A thin-wall aluminum ring (4\" OD, 3.7\" ID, 1\" long) is held in hard jaws. It measures perfectly round in the chuck. Once it's removed, it's out of round by 0.006\" with three high spots.",
    options: [
      { text: "Three-jaw clamping distortion. Use soft jaws bored to the part diameter for full-contact gripping, and reduce chuck pressure.",
        result: "best",
        feedback: "Three high spots on a thin ring is the fingerprint of three-jaw squeeze. The ring was distorted into a triangle in the chuck, cut round while distorted, then sprang back out of round when released. Bored soft jaws spread the load around the ring; lower pressure reduces the squeeze." },
      { text: "Lower the chuck pressure but keep the hard jaws.",
        result: "partial",
        feedback: "Less pressure helps, but hard jaws still concentrate the load at three points. A thin ring needs full-contact gripping." },
      { text: "Take a finish pass at a lighter DOC.",
        result: "bad",
        feedback: "The part is round in the chuck already. A lighter cut changes nothing; the distortion happens when the jaws release." },
      { text: "Increase chuck pressure so the part can't move during cutting.",
        result: "bad",
        feedback: "The part isn't moving. It's being squeezed out of shape. More pressure means more distortion." },
    ],
    whyItMatters: "Thin walls remember how they were clamped. Any time a part measures right in the chuck and wrong on the bench, suspect clamping distortion.",
  },
  {
    id: "wh-03",
    category: "workholding",
    difficulty: 2,
    situation:
      "Second operation on a shaft: the finished OD from op 1 is being held in soft jaws to machine the other end. The finished OD is getting marred, and the second-op features are running out 0.003\" to the first-op OD.",
    options: [
      { text: "Bore the soft jaws in place at working chuck pressure, to the actual part diameter, with the jaws pre-loaded on a ring or plug.",
        result: "best",
        feedback: "Soft jaws are only true if they were bored on this chuck, at this pressure, with the jaw scroll loaded the same way it will be in production. Jaws bored loose, at a different pressure, or on another machine will hold off-center and bite the part on their edges." },
      { text: "Wrap the OD in shim stock or a piece of aluminum can to protect it.",
        result: "partial",
        feedback: "Protects the finish, but adds a soft, uneven layer that makes runout worse. The jaws are the problem." },
      { text: "Indicate each part in and tap it true before the cycle.",
        result: "partial",
        feedback: "You can fix runout part by part, but it's slow and fragile. Properly bored jaws hold repeatably without indicating." },
      { text: "Increase chuck pressure so the part can't shift.",
        result: "bad",
        feedback: "More pressure on badly bored jaws just mars the OD deeper. The runout is in the jaws, not in slippage." },
    ],
    whyItMatters: "Soft jaws are a precision tool. Bored right, they hold a finished diameter to under 0.001\" with no marks. Bored wrong, they're worse than hard jaws.",
  },
  {
    id: "wh-04",
    category: "workholding",
    difficulty: 3,
    situation:
      "Boring a 2\" deep hole in a steel part held in a 3-jaw chuck. Chatter starts about 1\" deep and gets worse to the bottom. The boring bar is steel, 0.750\" diameter, sticking out 4\" from the holder. Speed and feed are conservative.",
    options: [
      { text: "Reduce the bar's stick-out to the minimum needed, or switch to a carbide-shank bar. Length-to-diameter of the bar is the driver.",
        result: "best",
        feedback: "A steel boring bar is good to about 4:1 length to diameter; this one is over 5:1 and gets less stiff as the cut goes deeper. Stiffness falls off with the CUBE of length, so shortening stick-out even a little helps a lot. Carbide shank bars run to 6:1 or more." },
      { text: "Slow the spindle down until the chatter stops.",
        result: "partial",
        feedback: "Changing RPM can move you off a resonant speed and quiet it down, but a bar hanging out 5:1 will chatter again with any change. Fix the stiffness." },
      { text: "Take a heavier DOC to load the bar and damp the vibration.",
        result: "partial",
        feedback: "Sometimes a heavier chip does stabilize a cut, but with an over-extended steel bar you're just as likely to deflect it further and lose size. Not the first thing to try." },
      { text: "Increase the feed rate to get through the cut before chatter builds.",
        result: "bad",
        feedback: "Chatter isn't a time problem. More feed on a flexible bar means more deflection and worse finish." },
    ],
    whyItMatters: "Boring bar stiffness drops with the cube of overhang. Every inch you can shorten pays off disproportionately. Know the L:D limits for steel, heavy metal, and carbide shanks.",
  },
  {
    id: "wh-05",
    category: "workholding",
    difficulty: 3,
    situation:
      "A part is held between a chuck and a live center in the tailstock. Parts were fine all morning. After lunch, diameters at the tailstock end started running 0.002\" oversize and the tailstock end has a faint chatter. The tailstock hasn't been touched.",
    options: [
      { text: "Check the live center: bearings may be failing or the center may have lost pressure as the machine warmed up. Re-seat and re-check center pressure and runout.",
        result: "best",
        feedback: "The tailstock end going oversize AND chattering points at the support at that end. Live centers wear, lose preload, and can pick up runout as their bearings heat and loosen. Thermal growth of the part can also change the pressure at the center. Indicate the center and check its pressure before touching anything else." },
      { text: "Index the insert; it's probably worn.",
        result: "partial",
        feedback: "Wear would show along the whole part, not just at the tailstock end. Index if it's due, but the localized symptom says look at the tailstock." },
      { text: "Increase tailstock pressure hard to stop the movement.",
        result: "bad",
        feedback: "Cranking pressure on a suspect center can bow the part, overheat the bearings, and push the chuck end off center. Diagnose first." },
      { text: "Remove the tailstock and run the part unsupported.",
        result: "bad",
        feedback: "The part needed support this morning; it still does. You'd trade a 0.002\" problem for a taper and chatter problem." },
    ],
    whyItMatters: "When a problem is localized to one end of the part, the workholding at that end is the first suspect. Live centers are a consumable and fail gradually.",
  },

  // ==========================================================================
  //  BAR FEEDING & BAR WORK  (bf-)
  // ==========================================================================
  {
    id: "bf-01",
    category: "bar-work",
    difficulty: 1,
    situation:
      "Starting a bar-fed job in 1.25\" 12L14. A center drill starts the hole for a 0.312\" drill. On several parts the drilled hole is off-center and the drill walks, leaving the hole out of position to the OD.",
    options: [
      { text: "Face the bar end first so the center drill starts on a flat, square surface, and keep the center drill short and stiff.",
        result: "best",
        feedback: "Bar stock ends are sawcut: rough, angled, and rarely square. A center drill entering an angled surface gets pushed sideways and starts off center; every tool after it follows that hole. Face first, then center drill with minimum stick-out." },
      { text: "Slow the drill down so it doesn't wander as much.",
        result: "partial",
        feedback: "Slower helps the drill follow the hole a bit better, but the hole is already started off-center by the center drill. Fix the start." },
      { text: "Skip the center drill and let the twist drill find its own center.",
        result: "bad",
        feedback: "A twist drill on a sawcut bar end wanders far worse than a center drill does. That's why the center drill is there." },
      { text: "Increase chuck pressure so the bar can't shift.",
        result: "bad",
        feedback: "The bar isn't shifting. The drill is starting on a bad surface. Pressure doesn't fix geometry." },
    ],
    whyItMatters: "On bar work, every hole starts with the bar end. Face, then spot, then drill. Skipping the face is the most common reason a bar-fed hole walks.",
  },
  {
    id: "bf-02",
    category: "bar-work",
    difficulty: 2,
    situation:
      "Running 1\" diameter 4140 bar through the spindle liner and bar feeder. Every few parts there's a loud rhythmic thumping from the headstock and parts show a periodic pattern in the OD finish. It gets quieter as the bar gets shorter.",
    options: [
      { text: "Bar whip. Check that the spindle liner matches the bar size and that the bar feeder's support channel is set correctly; reduce RPM if the bar is bent or you're near the end of the liner's range.",
        result: "best",
        feedback: "An unsupported length of bar spinning inside an oversize liner whips like a jump rope. It's worst when the bar is long (heavy) and stops as the bar shortens. The liner should be a close fit to the bar. A bent bar makes it much worse; check straightness on incoming stock." },
      { text: "Slow the spindle down for the whole job.",
        result: "partial",
        feedback: "Lower RPM does calm whip, but you'd be running every feature slower to compensate for a liner or support issue you could fix. Try the mechanical fix first." },
      { text: "Push the bar feeder's feed pressure up to hold the bar tighter.",
        result: "bad",
        feedback: "Feed pressure is about pushing the bar forward, not damping whip. Too much pressure can drive the bar into the part during the cut." },
      { text: "Ignore it; the noise stops on its own as the bar shortens.",
        result: "bad",
        feedback: "Bar whip beats up spindle bearings, ruins finish, and can bend the bar. It's not cosmetic." },
    ],
    whyItMatters: "Unsupported spinning bar is a rotor. Support it close to its diameter and keep RPM within what the bar length and straightness allow.",
  },
  {
    id: "bf-03",
    category: "bar-work",
    difficulty: 2,
    situation:
      "A part on a bar job needs 1.8\" of bar extended out of the collet. The 0.5\" nearest the collet finishes nicely, but the OD out toward the free end chatters and comes out oversize. The bar is only 0.625\" diameter.",
    options: [
      { text: "Too much unsupported bar for the diameter. Machine the part in stages: feed out and finish the first section, then feed out more; or support the free end with the sub-spindle or tailstock.",
        result: "best",
        feedback: "Almost 3:1 of a 0.625\" bar hanging out of a collet is a flexible cantilever. The free end pushes away from the tool (oversize) and springs back (chatter). Working in shorter feed-outs, or supporting the free end, is the fix. Confirm the collet is the right size and clean while you're at it." },
      { text: "Slow down and take lighter cuts toward the free end.",
        result: "partial",
        feedback: "Lighter cuts reduce the force but don't remove the overhang. You'll be slow and still fighting deflection on every part." },
      { text: "Increase collet pressure to maximum.",
        result: "partial",
        feedback: "If the collet is a good fit, more pressure helps grip. But if it's the wrong size or dirty, more pressure just crushes the bar surface without gripping better. Check the collet first." },
      { text: "Extend the bar even further so you can turn the whole part in one pass.",
        result: "bad",
        feedback: "More stick-out on a 0.625\" bar makes both deflection and chatter worse. Wrong direction." },
    ],
    whyItMatters: "Bar work is a constant negotiation between how much bar is hanging out and how stiff it is. Small diameters need short feed-outs, correct collets, and clean gripping surfaces.",
  },
  {
    id: "bf-04",
    category: "bar-work",
    difficulty: 3,
    situation:
      "Bar-fed job, 0.75\" 303 stainless. Overall length of the finished part is drifting: mostly fine, but every 8 to 10 parts one comes out 0.030\" short. Nothing in the program is conditional.",
    options: [
      { text: "The bar is slipping back in the collet after feed-out, or the bar stop / pull-out is inconsistent. Check collet grip, the bar stop position, and whether the feeder pushes the bar firmly against the stop before the collet closes.",
        result: "best",
        feedback: "Random short parts on a bar job mean the bar wasn't where the program thought it was when the collet closed. Either the bar didn't reach the stop (low feed pressure, chips on the stop face, a burr on the bar end catching in the liner) or it slid back after gripping (oily collet, wrong size). The program can't fix this; the mechanics have to be consistent." },
      { text: "Add 0.030\" of extra stock to the feed-out length and face the difference away.",
        result: "partial",
        feedback: "This hides the symptom on the short parts but adds cycle time to every part and doesn't stop the bar from slipping. And if the slip gets bigger, you're back where you started." },
      { text: "Increase the spindle speed so the collet's centrifugal force grips tighter.",
        result: "bad",
        feedback: "Collets don't work that way, and this ignores the real cause. Chuck-jaw grip actually gets worse with RPM." },
      { text: "Slow down the facing feed so it can handle the extra material.",
        result: "bad",
        feedback: "The facing tool isn't the problem. The bar position is. This adds time and fixes nothing." },
    ],
    whyItMatters: "Intermittent dimension shifts on bar work are almost always the bar moving relative to the collet. Look at the feed-out and the grip, not the program.",
  },
  {
    id: "bf-05",
    category: "bar-work",
    difficulty: 3,
    situation:
      "New lot of 12 ft. 1\" hot-rolled bars arrived. With the same program that ran perfectly on the previous lot, the first bars are producing chatter on the OD finish pass and the parting tool is breaking.",
    options: [
      { text: "Check the incoming bar for straightness and diameter. Bent or oversize bar increases runout and whip, loads the parting tool unevenly, and changes the finish pass DOC.",
        result: "best",
        feedback: "Hot-rolled bar can vary in straightness and diameter lot to lot. A bent bar runs out at the cut, so the parting insert sees an interrupted, hammering load and the finish pass takes a varying chip. Roll a bar on a flat surface or check runout in the machine. Reject or straighten bad stock, or turn it down before finishing." },
      { text: "Slow the spindle down for the finish pass and parting.",
        result: "partial",
        feedback: "Lower RPM reduces the whip and impact and might get you through this lot, but you're running slow because of a material problem the supplier should hear about." },
      { text: "Switch to a tougher parting insert grade.",
        result: "partial",
        feedback: "A tougher grade survives interrupted cutting better, but you haven't fixed the reason the cut is interrupted. Check the bar." },
      { text: "Increase the parting feed rate so the insert spends less time in the cut.",
        result: "bad",
        feedback: "More feed on a parting blade that's already being hammered by a bent bar is a fast way to break more blades." },
    ],
    whyItMatters: "Material is an input to your process. When a proven program suddenly misbehaves on a new lot, inspect the stock before changing the program.",
  },

  // ==========================================================================
  //  MATERIAL BEHAVIOR  (mb-)
  // ==========================================================================
  {
    id: "mb-01",
    category: "material",
    difficulty: 1,
    situation:
      "Same program, same insert, same speeds and feeds. It ran great on 1018 mild steel yesterday. Today the job is 304 stainless and the insert is burning up in 6 parts with a rough, torn finish.",
    options: [
      { text: "Stainless needs different parameters: lower SFM than mild steel, a positive rake edge, plenty of coolant, and a chip load heavy enough to get under the work-hardened layer.",
        result: "best",
        feedback: "304 work-hardens, has low thermal conductivity (heat stays in the tool instead of leaving in the chip), and is gummy. Mild steel parameters are far too fast for it. A material change is a parameter change, every time." },
      { text: "Keep the same speed but back off the feed to be gentle.",
        result: "bad",
        feedback: "Lighter feed on stainless increases rubbing and work hardening. Speed is what needs to come down; feed should stay reasonable." },
      { text: "Switch to a fresh insert of the same grade and keep going.",
        result: "bad",
        feedback: "The new insert will die the same way. The parameters are wrong for the material." },
      { text: "Reduce the SFM but don't change anything else.",
        result: "partial",
        feedback: "Bringing speed down is the biggest single fix and might get you running. But stainless also wants coolant on the edge and a chip thick enough to shear cleanly, so check those too." },
    ],
    whyItMatters: "Different alloys aren't interchangeable at the same parameters. Thermal conductivity, work hardening, and hardness all change what speed and feed the edge can survive.",
  },
  {
    id: "mb-02",
    category: "material",
    difficulty: 2,
    situation:
      "Turning a 4\" diameter 6061 aluminum part to a 0.001\" total tolerance on the OD. Parts measure perfect right off the machine, but 20 minutes later on the inspection bench they're 0.002\" undersize.",
    options: [
      { text: "Thermal contraction. The part was hot from cutting and measured oversize while warm. Let parts cool to room temperature before final measurement, or measure hot and compensate consistently.",
        result: "best",
        feedback: "Aluminum expands roughly twice as much as steel per degree. A 4\" aluminum part that's 40°F warm from cutting is about 0.002\" bigger than it will be at room temperature. If you measure hot and cut to size, the cold part will be undersize. Control the temperature you measure at." },
      { text: "Add 0.002\" to the programmed diameter.",
        result: "partial",
        feedback: "This compensates for today's heat, but if the coolant is colder tomorrow or the cycle runs slower, the offset is wrong. Understand the cause and control the measurement conditions." },
      { text: "The insert is wearing and cutting undersize; index it.",
        result: "bad",
        feedback: "Tool wear on an OD makes the part BIGGER, not smaller. And the parts measured right at the machine. This is thermal." },
      { text: "The micrometer on the inspection bench must be out of calibration.",
        result: "bad",
        feedback: "Possible in theory, but two instruments disagreeing by the same amount on every part when one measures hot and one cold is a temperature signature. Check the physics before blaming the gage." },
    ],
    whyItMatters: "Thermal expansion is real at tight tolerances, especially in aluminum and on large diameters. Know your material's expansion rate and control when and where you measure.",
  },
  {
    id: "mb-03",
    category: "material",
    difficulty: 2,
    situation:
      "Drilling a 0.25\" hole in 316 stainless. The first hole drilled fine. On the next part, the drill dwelled for a few seconds at the bottom of the hole while the operator paused. Now the drill won't cut through the same spot and just squeals and rubs.",
    options: [
      { text: "Dwelling work-hardened the bottom of the hole. Withdraw, replace or re-sharpen the drill, and never let a tool dwell in stainless. Pierce the hardened skin with a fresh, sharp edge at full feed.",
        result: "best",
        feedback: "Austenitic stainless work-hardens hard and fast under rubbing. A drill that dwells creates a glass-hard skin that then destroys the edge trying to cut it. Feed must never stop while the tool is in contact. The drill is likely already damaged from trying to push through." },
      { text: "Increase the feed and force it through.",
        result: "partial",
        feedback: "A fresh, sharp drill at full feed can pierce the skin. But a drill that's already been rubbing on it is dulled and will just work-harden it more. Change the drill first." },
      { text: "Slow the spindle down and try again with the same drill.",
        result: "bad",
        feedback: "Slower with a dulled drill is more rubbing, more heat, more hardening." },
      { text: "Increase spindle speed to burn through it.",
        result: "bad",
        feedback: "More speed with a dull edge on a hardened skin overheats the drill tip in seconds." },
    ],
    whyItMatters: "Work-hardening alloys punish any hesitation. Feed continuously, never dwell, and don't use a rubbed-out edge to try to recover.",
  },
  {
    id: "mb-04",
    category: "material",
    difficulty: 3,
    situation:
      "Turning gray cast iron. The insert lasts fine, but the finish is dull and slightly powdery-looking, and there's a fine gray dust everywhere. The operator is running flood coolant like on steel jobs.",
    options: [
      { text: "This is fairly normal for cast iron: it makes a short powdery chip, not a curl. Consider running it dry or with air blast instead of coolant, since coolant turns the iron dust into an abrasive sludge that wears ways and seals.",
        result: "best",
        feedback: "Gray iron has graphite flakes that break the chip into powder; the finish will never look like polished steel. Many shops run iron dry (with dust collection or air) because the coolant-plus-iron-dust mixture is abrasive and hard on the machine. The dull finish is the material, not a fault." },
      { text: "Increase the feed for a better finish.",
        result: "bad",
        feedback: "Heavier feed on cast iron makes the finish coarser. And the powdery look is the graphite, not a feed problem." },
      { text: "Slow down and take a lighter finish pass.",
        result: "partial",
        feedback: "A light pass with a sharp edge can make the finish a bit tighter, but iron finish is fundamentally limited by the graphite structure. Set expectations with the print, not the parameters." },
      { text: "Change to a polished aluminum finishing insert for a mirror finish.",
        result: "bad",
        feedback: "Aluminum inserts are too sharp and fragile for cast iron; they chip fast. And iron won't mirror-polish regardless." },
    ],
    whyItMatters: "Chip form and finish are properties of the material as much as the process. Know what a 'good' finish looks like on each material before chasing one that isn't possible.",
  },
  {
    id: "mb-05",
    category: "material",
    difficulty: 3,
    situation:
      "A batch of 4140 shafts is being turned. The finish and tool life on the first 50 are fine. The next bar cuts noticeably harder, chips are shorter and darker, and the insert starts chipping. The bar looks identical and came from the same rack.",
    options: [
      { text: "Suspect a heat-treat or lot difference. Check the bar's heat lot tag and hardness. 4140 can arrive annealed, normalized, or pre-hard and they cut very differently.",
        result: "best",
        feedback: "4140 is sold in several conditions. Annealed is around 200 HB; pre-hard (Q&T) runs 28 to 32 HRC. If bars from two lots got mixed on the rack, the pre-hard bar needs maybe 30% lower SFM and a tougher grade. A quick hardness check confirms it in a minute." },
      { text: "Reduce SFM until the chipping stops and keep going.",
        result: "partial",
        feedback: "You can adapt the parameters and finish the run, but if the bar is a different condition than the print calls for, you may be making parts from the wrong material. Verify it." },
      { text: "Switch to a tougher insert grade.",
        result: "partial",
        feedback: "A tougher grade handles the harder material better, but you still need to know whether this bar is what the job requires." },
      { text: "The insert was probably defective; index and continue at the same parameters.",
        result: "bad",
        feedback: "A sudden change in chip color and cutting sound is the material talking, not a bad insert. Ignoring it risks scrapping parts and more inserts." },
    ],
    whyItMatters: "'Same alloy' does not mean 'same hardness.' Heat treat condition changes machinability more than most alloy differences do. Listen to the chip.",
  },

  // ==========================================================================
  //  SURFACE FINISH & CHATTER DIAGNOSIS  (fc-)
  // ==========================================================================
  {
    id: "fc-01",
    category: "finish-chatter",
    difficulty: 1,
    situation:
      "An OD finish pass shows a regular, evenly spaced chatter pattern along the whole length. The part is short and stubby, well supported. The tool is a new insert in a rigid holder with short stick-out. Chatter started when the spindle speed was bumped up 15%.",
    options: [
      { text: "You've hit a resonant speed. Change the RPM, up or down 10 to 15%, and the chatter will usually disappear.",
        result: "best",
        feedback: "Chatter is self-excited vibration. Every setup has speeds where the tooth-passing frequency lines up with a natural frequency of the system and the vibration feeds itself. Since it started with a speed change and the setup is rigid, moving the RPM off that spot is the fix." },
      { text: "Reduce the feed rate.",
        result: "partial",
        feedback: "Lighter feed sometimes reduces chatter, but often makes it worse because the chip is thinner and the tool rubs. RPM is the direct lever here." },
      { text: "Reduce the DOC to lighten the cut.",
        result: "partial",
        feedback: "Less DOC lowers the cutting force and can help, but you'll be taking more passes. Try moving off the resonant speed first; it's free." },
      { text: "Loosen the toolholder clamp slightly so the tool can absorb some of the vibration.",
        result: "bad",
        feedback: "Never. A loose tool is less stiff, which is the opposite of what stops chatter, and it can shift or pull out during the cut. Everything in the tool stack should be as tight and short as possible." },
    ],
    whyItMatters: "When a rigid setup suddenly chatters after a speed change, you've found a resonance. The cheapest fix is a different RPM.",
  },
  {
    id: "fc-02",
    category: "finish-chatter",
    difficulty: 2,
    situation:
      "A finish turned surface has a consistent 'feed line' pattern visible: fine, evenly spaced grooves you can feel with a fingernail. The print calls for 63 Ra and you're measuring 110 Ra. The tool has a 0.016\" nose radius.",
    options: [
      { text: "Increase the nose radius or reduce the feed per revolution. Theoretical finish depends on feed squared divided by nose radius.",
        result: "best",
        feedback: "The visible groove pattern IS the feed mark. Surface finish is dominated by feed and nose radius: roughly Ra ∝ f² / r. Doubling the nose radius roughly halves the roughness at the same feed. Reducing feed by 30% cuts roughness about in half too. Pick whichever costs less cycle time." },
      { text: "Increase spindle speed for a smoother surface.",
        result: "partial",
        feedback: "Higher SFM can reduce built-up edge and give a shinier surface, but it does nothing about the geometric feed marks. The grooves will still be there at the same spacing." },
      { text: "Take a second spring pass at the same feed.",
        result: "bad",
        feedback: "A spring pass at the same feed leaves the same feed-mark geometry. It doesn't change the math." },
      { text: "Polish the part with emery after machining.",
        result: "bad",
        feedback: "Hand-polishing every part is not a process; it changes dimensions unpredictably and costs labor. Fix the cut." },
    ],
    whyItMatters: "Surface roughness from turning is mostly geometry: feed per rev and nose radius. Learn the relationship and you can predict finish before you cut.",
  },
  {
    id: "fc-03",
    category: "finish-chatter",
    difficulty: 2,
    situation:
      "Parting off a 1.5\" diameter steel part with a 0.118\" wide blade. The blade squeals and leaves a chattered face as it gets toward center. The blade is hanging out just far enough to reach center plus a little.",
    options: [
      { text: "Reduce the feed as the blade approaches center or clamp the RPM so the surface speed doesn't collapse, and make sure the blade is on center height and perpendicular to the axis.",
        result: "best",
        feedback: "As a parting blade approaches center, surface speed drops toward zero (if in G97) or RPM runs away (if in G96), and a blade that's above or below center rubs instead of cuts in the last portion. Parting is usually run in fixed RPM, so the cutting speed near center is tiny and the tool rubs, squeals, and chatters. Slower feed near center and correct center height fix most of it." },
      { text: "Increase the feed to get through faster.",
        result: "bad",
        feedback: "A heavy feed near center with almost no surface speed is how blades break." },
      { text: "Increase stick-out so the blade has more clearance.",
        result: "bad",
        feedback: "Parting blades are thin and flexible. More stick-out means more deflection and more chatter. Keep it minimal." },
      { text: "Use flood coolant aimed at the blade.",
        result: "partial",
        feedback: "Coolant in a parting cut is important for chip evacuation and heat, and helps. But the chatter near center is about center height, speed, and feed. Coolant alone won't stop it." },
    ],
    whyItMatters: "Parting is the most sensitive turning operation to center height and to what happens to speed near X0. A blade even 0.005\" off center changes the cutting geometry dramatically.",
  },
  {
    id: "fc-04",
    category: "finish-chatter",
    difficulty: 3,
    situation:
      "A bored hole in a steel part shows chatter marks only in the last 0.25\" at the bottom of the bore, right where the tool reaches a shoulder. The rest of the bore is clean. Same tool, same speed, same feed the whole way.",
    options: [
      { text: "The tool is cutting on two surfaces at once at the shoulder (bore and face), roughly doubling the engagement and cutting force. Program a separate, lighter cleanup pass on the shoulder, or reduce feed only in the corner.",
        result: "best",
        feedback: "Chatter that appears only at a shoulder while everything else is clean is about engagement, not speed. At the corner the insert suddenly cuts with much more of its edge. Treat the corner as its own operation with its own feed, or rough it with a different approach." },
      { text: "Reduce the feed for the whole bore.",
        result: "partial",
        feedback: "This quiets the shoulder but slows the entire bore for a problem that only exists in the last quarter inch." },
      { text: "Slow the RPM for the whole bore.",
        result: "partial",
        feedback: "Same story: might work, costs time everywhere. The problem is localized; the fix should be too." },
      { text: "Use a bigger nose radius insert to strengthen the corner.",
        result: "bad",
        feedback: "A larger nose radius increases the engaged edge length in the corner even more and pushes the tool harder. It typically makes shoulder chatter worse." },
    ],
    whyItMatters: "Localized chatter means localized cause. Ask what changes in the cut right where the marks start. Corners and shoulders change engagement suddenly.",
  },
  {
    id: "fc-05",
    category: "finish-chatter",
    difficulty: 3,
    situation:
      "A finish surface looks fine to the eye but the profilometer shows a periodic waviness, about 0.0002\" high, with a pitch of roughly 0.4\" along the part. It doesn't match the feed rate (0.006 IPR), and the pattern shows at the same spacing no matter what feed you use.",
    options: [
      { text: "Something in the machine is producing a once-per-revolution or fixed-frequency disturbance: check spindle bearings, the chuck or part for imbalance, and the drive belt. A pattern that doesn't scale with feed is coming from the machine, not the tool path.",
        result: "best",
        feedback: "Tool-path features scale with feed. A wave that keeps its spacing regardless of feed is coming from a rotating element: an imbalanced chuck or part, a spindle bearing, a belt with a stiff spot, or a hydraulic pulse. Compute the frequency from the spacing and RPM to figure out which." },
      { text: "Reduce the feed so the finish improves.",
        result: "bad",
        feedback: "The scenario already says the pattern is unchanged by feed. Feed isn't the source." },
      { text: "Change to a sharper insert.",
        result: "bad",
        feedback: "A sharper insert changes the micro-finish but won't remove a machine-driven wave." },
      { text: "Check the part for runout and re-indicate the chuck.",
        result: "partial",
        feedback: "Runout is one possible source of a once-per-rev wave, so this is a reasonable first check. But the broader lesson is that any fixed-frequency disturbance (bearing, belt, imbalance) can do this. Don't stop at runout if that checks out." },
    ],
    whyItMatters: "Separate tool-path finish from machine-condition finish by asking: does it scale with feed? If not, look at the machine.",
  },

  // ==========================================================================
  //  DIMENSIONAL PROBLEMS & INSPECTION  (di-)
  // ==========================================================================
  {
    id: "di-01",
    category: "dimensional",
    difficulty: 1,
    situation:
      "An OD is toleranced at 1.2500 +0.0000/-0.0010. Parts started the shift at 1.2495 and have crept up steadily: 1.2497, 1.2499, and the latest one is 1.2501, out of tolerance high. No offsets have been touched.",
    options: [
      { text: "Normal tool wear on the OD. Adjust the wear offset to bring the size back down toward the low side of tolerance, and plan to index the insert on a fixed count.",
        result: "best",
        feedback: "As the flank wears, the cutting edge effectively moves away from the part, so an OD grows. A steady creep is exactly what wear looks like. Aim the offset back to 1.2494 or so to use the full tolerance band before the next adjustment. Track how many parts per adjustment and index before the edge fails." },
      { text: "Index the insert immediately and don't touch the offset.",
        result: "partial",
        feedback: "A fresh edge brings the size back, but you've thrown away edge life that a simple offset adjustment could have used. Offsets are for exactly this." },
      { text: "The material must be expanding as the machine warms up; wait for it to stabilize.",
        result: "bad",
        feedback: "Thermal growth of a small steel part is far smaller than this, and it wouldn't creep steadily in one direction for a whole shift. This is wear." },
      { text: "Increase the feed so the tool cuts more aggressively and takes the size down.",
        result: "bad",
        feedback: "Feed doesn't set diameter; the offset does. Changing feed to fix size introduces finish and wear changes for no reason." },
    ],
    whyItMatters: "Steady one-direction drift on an OD is wear. Use wear offsets to ride the tolerance band and index on a count rather than on a scrap part.",
  },
  {
    id: "di-02",
    category: "dimensional",
    difficulty: 2,
    situation:
      "A bore is toleranced 1.0000 +0.0010/-0.0000. The operator measures it with a dial bore gage and gets 1.0004. The inspector measures the same part with an air gage and gets 0.9998, undersize. Both gages were calibrated this month.",
    options: [
      { text: "Check how each gage is being used: the dial bore gage needs to be rocked to find the true diameter (the minimum reading), and both should be compared on the same setting ring. A 0.0006\" disagreement is a technique or reference problem, not a part problem.",
        result: "best",
        feedback: "A dial bore gage read without rocking through the true diameter reads OVERSIZE because you're measuring a chord. Air gages are less technique-sensitive. Before arguing about the part, put both gages on one master ring and compare. Then re-measure the part with agreed technique." },
      { text: "Trust the inspector's air gage; it's more accurate.",
        result: "partial",
        feedback: "Air gages are typically more repeatable, but blindly picking a winner without checking both against a master leaves the disagreement unresolved for the next part." },
      { text: "Open the bore up 0.0003\" to satisfy both gages.",
        result: "bad",
        feedback: "Splitting the difference between two disagreeing gages is not measurement. You don't know the real size yet." },
      { text: "Trust the operator's gage since it was calibrated too.",
        result: "bad",
        feedback: "Calibration doesn't protect against technique error. A dial bore gage read at the wrong angle is wrong no matter how recently it was calibrated." },
    ],
    whyItMatters: "Two calibrated gages that disagree means one of them is being used differently. Resolve it on a master before touching the process.",
  },
  {
    id: "di-03",
    category: "dimensional",
    difficulty: 2,
    situation:
      "The first part of the morning on a lathe that sat overnight measures 0.0008\" different from the last part of the previous evening on a 2\" bore. The program and offsets are untouched. After about 30 minutes of running, parts drift back to where they were.",
    options: [
      { text: "Machine thermal growth. The spindle, ballscrews, and structure change size as they warm up. Warm the machine up before running critical parts, or run a warm-up program.",
        result: "best",
        feedback: "A cold machine is a different machine. Spindle bearings and ballscrews grow measurably in the first half hour of running. Most shops run a warm-up cycle before tight-tolerance work. The 30-minute return to normal is the confirmation." },
      { text: "Adjust the offset for the first part and readjust as it drifts.",
        result: "partial",
        feedback: "Chasing the drift works but means a series of adjustments every morning and a risk of scrapping the first few parts. A warm-up cycle is cheaper." },
      { text: "The insert must have been damaged overnight.",
        result: "bad",
        feedback: "Inserts don't change overnight sitting in a turret, and a damaged edge wouldn't 'heal' after 30 minutes." },
      { text: "The coolant is cold and shrinking the part; warm the coolant first.",
        result: "partial",
        feedback: "Coolant temperature does affect part size, and it's part of the same warm-up picture. But the bigger effect is the machine structure itself. Warm up the whole machine." },
    ],
    whyItMatters: "Machines have a thermal state. Tight-tolerance work should start after warm-up, and the first part of the day deserves extra measurement.",
  },
  {
    id: "di-04",
    category: "dimensional",
    difficulty: 3,
    situation:
      "A print has a 1.500\" diameter with a runout callout of 0.002\" to datum A, where datum A is a smaller diameter on the other end of the shaft. Op 1 turns datum A. Op 2 flips the part and turns the 1.500 while gripping on datum A in hard jaws. Runout is measuring 0.005\".",
    options: [
      { text: "Op 2 gripping on datum A in hard jaws is introducing runout between the datum and the new feature. Hold datum A in bored soft jaws or a collet so the 1.500 diameter is cut concentric to it.",
        result: "best",
        feedback: "Runout to a datum means the feature must be concentric to that datum. Whatever you're holding in op 2 defines the new axis. Hard jaws hold with 0.002 to 0.005\" of eccentricity routinely, which becomes runout between A and the 1.500. Bored soft jaws or a collet hold the datum true." },
      { text: "Indicate datum A true in the hard jaws before each op 2 cycle.",
        result: "partial",
        feedback: "This works part by part, but it's slow and depends on the operator. Correct workholding does it automatically." },
      { text: "Take a light cleanup pass on datum A during op 2 to re-establish it.",
        result: "bad",
        feedback: "You'd be re-cutting the datum feature in the second op, changing its size and defeating the purpose of a datum. Don't move the reference." },
      { text: "Reduce the DOC on the 1.500 so it doesn't push the part off center.",
        result: "bad",
        feedback: "The runout is from how the part is held, not from cutting force. A lighter cut on an eccentrically held part is still eccentric." },
    ],
    whyItMatters: "A runout callout is telling you which surface to hold or locate on. Workholding in the second op has to be true to the datum, not just tight.",
  },
  {
    id: "di-05",
    category: "dimensional",
    difficulty: 3,
    situation:
      "A groove width is called out 0.125 ±0.001. Measured with pin gages, a 0.124 pin goes in and a 0.126 pin doesn't. Measured with a caliper, the operator reads 0.1265 and wants to adjust the tool.",
    options: [
      { text: "Trust the pins. The pin gage check shows the groove is between 0.124 and 0.126, which is in tolerance. A caliper isn't a suitable instrument for a ±0.001 feature.",
        result: "best",
        feedback: "Calipers are good to maybe ±0.002 in practiced hands, and reading a narrow groove with caliper jaws is worse than that. Pin gages (or a gage block stack) give a true go/no-go on the width. Adjusting a good groove based on a caliper reading would push it out of tolerance." },
      { text: "Adjust the tool by half the difference to be safe.",
        result: "bad",
        feedback: "The groove is in tolerance. Adjusting on the caliper's say-so moves a good feature toward bad." },
      { text: "Average the two methods and adjust to that.",
        result: "bad",
        feedback: "Averaging a suitable gage with an unsuitable one gives an unsuitable answer." },
      { text: "Measure it with a depth mic or a gage block stack to get a third opinion.",
        result: "partial",
        feedback: "A gage block stack is a legitimate check and would confirm the pins. Reasonable, but the pins have already answered the question; don't second-guess a proper gage with a caliper." },
    ],
    whyItMatters: "Match the instrument to the tolerance. A 10:1 rule (gage resolution 10x finer than the tolerance) keeps you from chasing measurement noise.",
  },

  // ==========================================================================
  //  COOLANT & CHIP EVACUATION  (cc-)
  // ==========================================================================
  {
    id: "cc-01",
    category: "coolant-chips",
    difficulty: 1,
    situation:
      "Boring a 1\" diameter blind hole 3\" deep in steel. Halfway through the batch, the bore finish goes bad, the bar starts groaning, and the last part came out with the bore scored. The coolant nozzle is pointed at the outside of the part, not into the hole.",
    options: [
      { text: "Chips are packing in the blind bore and being recut. Aim coolant (ideally through-tool or a nozzle into the bore) to flush chips out, and consider a bore with an internal coolant channel.",
        result: "best",
        feedback: "In a blind hole, chips have one way out: back past the tool. Without coolant flow into the bore, they pile up at the bottom, get recut, score the wall, and load the bar. Getting coolant INTO the hole is the whole fix. Through-coolant boring bars exist for exactly this." },
      { text: "Reduce the feed so fewer chips are made.",
        result: "partial",
        feedback: "Fewer chips per second helps a little, but they still have nowhere to go. Evacuation is the problem, not volume." },
      { text: "Increase the coolant pump pressure with the nozzle where it is.",
        result: "bad",
        feedback: "More pressure aimed at the OD does nothing for the inside of the hole. Direction matters more than pressure." },
      { text: "Stop the machine partway through each bore and blow the chips out with an air gun.",
        result: "bad",
        feedback: "Slow, inconsistent, and puts a hand and an air nozzle near a hot part every cycle. Fix the coolant delivery." },
    ],
    whyItMatters: "Chips must have a path out and something pushing them along it. On blind holes and bores, coolant direction is the difference between a good finish and a scrapped part.",
  },
  {
    id: "cc-02",
    category: "coolant-chips",
    difficulty: 2,
    situation:
      "Monday morning the coolant tank smells like rotten eggs, there's a slimy film on the surface, and operators are complaining of skin irritation. Parts are also starting to show light rust after sitting a day.",
    options: [
      { text: "Bacterial growth in the coolant. Check concentration and pH, skim the tramp oil, and if it's badly gone, dump, clean, and recharge the tank. Then fix the cause: usually low concentration, tramp oil, or stagnant weekends.",
        result: "best",
        feedback: "Rotten egg smell is bacteria producing hydrogen sulfide. They thrive when concentration drops, pH falls, and tramp oil seals off the surface from air over a weekend. Low concentration also explains the rust: not enough corrosion inhibitor. Test with a refractometer and pH strips before deciding whether to treat or dump." },
      { text: "Add more concentrate to the tank to kill the smell.",
        result: "partial",
        feedback: "Bringing concentration up is part of the fix and may help if caught early. But if the tank is already fouled with bacteria and tramp oil, topping off just feeds the problem. Measure first." },
      { text: "Add a splash of bleach to kill the bacteria.",
        result: "bad",
        feedback: "Never add unknown chemicals to a coolant system. Bleach can react with coolant components and produce harmful fumes, and it destroys the coolant chemistry. Use products the coolant manufacturer approves." },
      { text: "Ignore the smell; it'll go away once the machine starts running.",
        result: "bad",
        feedback: "Operators are already getting skin irritation. Rancid coolant is a health issue and a part-quality issue. It won't fix itself." },
    ],
    whyItMatters: "Coolant is a maintained system. Concentration, pH, and tramp oil need checking on a schedule. Smell, film, and rust are late warnings.",
  },
  {
    id: "cc-03",
    category: "coolant-chips",
    difficulty: 2,
    situation:
      "Turning 1018 steel. The finish is good, but the parts show a rainbow-brown heat tint on the machined surface, and the insert life is about half what the catalog says. The coolant nozzle is aimed at the part, but the stream is hitting the chip as it comes off, not the cutting edge.",
    options: [
      { text: "Redirect the coolant so it reaches the cutting edge and the flank, not just the chip. Heat is generated at the edge, and the chip shields it from a stream that comes in from above.",
        result: "best",
        feedback: "The chip curls up over the edge and acts like a roof. A stream aimed at the chip cools the chip, which is already leaving, and never touches the edge where the heat is. Aim under or beside the chip at the flank and rake face. Heat tint on the part means the part is running hot, which means the edge is hotter still." },
      { text: "Reduce the SFM to bring the temperature down.",
        result: "partial",
        feedback: "Lower speed reduces heat, but you'd be slowing a cut that could run at catalog speed if the coolant reached the edge." },
      { text: "Switch to a higher-concentration coolant mix.",
        result: "bad",
        feedback: "Concentration affects lubricity and corrosion protection, but coolant that doesn't reach the edge at 5% won't reach it at 8% either." },
      { text: "Run dry so the coolant isn't causing thermal shock to the insert.",
        result: "bad",
        feedback: "Thermal shock is a concern with interrupted cuts and certain ceramics, not steady turning of 1018 with carbide. Dry here would be worse." },
    ],
    whyItMatters: "Coolant only works where it lands. Watch where the stream actually goes during the cut, not where the nozzle points when the machine is stopped.",
  },
  {
    id: "cc-04",
    category: "coolant-chips",
    difficulty: 3,
    situation:
      "Drilling 1\" holes in 4140 with an indexable insert drill. Chips come out as tight, small curls at first, then after 30 seconds of drilling the coolant flow visibly drops, the chips turn long and stringy, and the drill starts to squeal. The coolant tank level is fine.",
    options: [
      { text: "The coolant filter or pump intake is clogging with chips as the cycle runs. Check the tank screens, chip conveyor, and pump strainer. Flow dropping during a cycle is a delivery problem, not a program problem.",
        result: "best",
        feedback: "Coolant that's fine at the start and fades during the cut points at restricted supply: a screen loading up with fines, a pump strainer half-blocked, or chips piling in the return path. Through-coolant drills need consistent volume; when flow drops, chips stop evacuating and the drill overheats." },
      { text: "Reduce the feed so the drill makes fewer chips.",
        result: "partial",
        feedback: "Fewer chips reduce the load on a marginal coolant system, but you're slowing production to compensate for a maintenance problem." },
      { text: "Increase the RPM to help the chips fly out.",
        result: "bad",
        feedback: "Chips leave a drilled hole because coolant pushes them, not because of RPM. More speed adds heat to an already starving cut." },
      { text: "Add a dwell at the bottom to let coolant catch up.",
        result: "bad",
        feedback: "Dwelling a drill at depth work-hardens the hole bottom and rubs the edge. Never dwell a drill." },
    ],
    whyItMatters: "Coolant volume and pressure at the tool are what matter, and they can change during a cycle. If flow fades, look upstream: screens, strainers, and pump.",
  },
  {
    id: "cc-05",
    category: "coolant-chips",
    difficulty: 3,
    situation:
      "Turning a titanium (Ti-6Al-4V) part. The shop is using the same coolant and nozzle setup that works on steel. The insert edges are chipping unpredictably, and sometimes the chips coming off show a faint spark.",
    options: [
      { text: "Titanium generates intense localized heat and its chips can ignite. It needs high-pressure, high-volume coolant aimed precisely at the edge, lower SFM than steel, and no dry running. Confirm the fire plan for titanium chips too.",
        result: "best",
        feedback: "Titanium has very low thermal conductivity, so heat concentrates at the edge. Poor coolant delivery lets the edge thermally cycle and chip. Titanium chips and fines are combustible, and a spark is a serious warning. High-pressure coolant at the edge, correct speeds, and a Class D extinguisher nearby are standard practice." },
      { text: "Switch to a tougher insert grade to handle the chipping.",
        result: "partial",
        feedback: "A tougher grade helps survive thermal cycling, but if coolant isn't controlling the heat, you'll still chip inserts and still risk ignition." },
      { text: "Run dry with an air blast so you can see the cut better.",
        result: "bad",
        feedback: "Dry titanium turning at steel-like speeds is a fire and tool-failure risk. Coolant on titanium is not optional." },
      { text: "Increase speed so chips leave faster and take the heat with them.",
        result: "bad",
        feedback: "Titanium's heat doesn't leave in the chip the way steel's does. More speed concentrates more heat at the edge and increases the chance of ignition." },
    ],
    whyItMatters: "Some materials change the rules. Titanium needs coolant strategy, speed, and fire awareness that steel doesn't. A spark in the chips is never 'normal.'",
  },

  // ==========================================================================
  //  SHOP SAFETY JUDGMENT CALLS  (ss-)
  // ==========================================================================
  {
    id: "ss-01",
    category: "safety",
    difficulty: 1,
    situation:
      "A long stringy chip has wrapped around the part and the toolholder during a cut. The spindle is still turning at 1200 RPM. The operator has pliers in hand and is opening the door to grab the chip while the machine is still running so they don't lose position.",
    options: [
      { text: "Stop. Feed hold, spindle stop, wait for it to be fully stopped, then clear the chip with pliers or a hook. Position is retained on feed hold; losing a few seconds is nothing.",
        result: "best",
        feedback: "A chip wrapped on a rotating part is a rope attached to a winch. Pliers can be yanked from a hand and a glove or sleeve can be pulled in. Feed hold doesn't lose position. There is no cycle time saving worth a hand." },
      { text: "Reach in with the pliers but keep a firm grip and pull quickly.",
        result: "bad",
        feedback: "Firm grip is exactly what gets a hand pulled in. Speed doesn't beat a spindle." },
      { text: "Use a longer hook so your hand is further away, but leave it running.",
        result: "bad",
        feedback: "Distance helps but doesn't remove the hazard. The hook can still be wrapped and yanked, and the door interlock is being bypassed. Stop the spindle." },
      { text: "Stop the spindle, clear the chip, and restart without changing anything.",
        result: "partial",
        feedback: "Safe for this one instance, and far better than reaching in. But the stringer will come back on every part, and each one is a new temptation to reach in. Fix the chip formation (feed, chipbreaker, or a programmed chip break) so it stops happening." },
    ],
    whyItMatters: "Never touch a rotating spindle, a chip attached to one, or anything near one. Feed hold and spindle stop cost nothing.",
  },
  {
    id: "ss-02",
    category: "safety",
    difficulty: 2,
    situation:
      "A 12 ft. bar is loaded for a bar-fed job, but there's no bar feeder available today. The operator wants to run it anyway with about 4 feet of bar sticking out the back of the spindle, running at the programmed 2500 RPM.",
    options: [
      { text: "Do not run. Unsupported bar sticking out the back of a spindle at speed will whip violently and can bend into a hook, destroy the machine, and kill someone. Cut the bar to a length fully inside the spindle liner, or wait for the feeder.",
        result: "best",
        feedback: "A few feet of bar rotating unsupported at high RPM is one of the most dangerous situations in a machine shop. The bar bends from centrifugal force, the bend increases the imbalance, and it whips into a hook in seconds. Bar must never extend beyond the spindle or support tube without proper support and speed limits." },
      { text: "Run it but reduce the RPM to 800.",
        result: "bad",
        feedback: "Lower speed reduces the risk but doesn't eliminate it. There is no safe RPM for 4 feet of unsupported bar. Don't." },
      { text: "Run it and stand well clear of the back of the machine.",
        result: "bad",
        feedback: "A whipping bar doesn't respect where you're standing. It will destroy the machine and anything nearby." },
      { text: "Cut the bar shorter so it's inside the spindle, but leave a few inches sticking out the back.",
        result: "partial",
        feedback: "Much better than 4 feet, but 'a few inches' out the back is still unsupported and still a hazard at speed. The bar should be fully within the spindle and liner or a proper bar support tube." },
    ],
    whyItMatters: "Bar whip is deadly. Bar stock never extends beyond the spindle or support without a properly set up bar feeder or support tube, full stop.",
  },
  {
    id: "ss-03",
    category: "safety",
    difficulty: 2,
    situation:
      "A new operator has been shown how to change inserts. You notice they're doing it with the machine in cycle-ready mode and the turret indexed to the tool with the door open and interlock defeated so they can 'see better,' with the spindle stopped.",
    options: [
      { text: "Stop them. Insert changes are done with the machine in a safe state: cycle stopped, spindle off, and the door interlock functioning. Defeating an interlock is never acceptable, regardless of how convenient it is.",
        result: "best",
        feedback: "An interlock defeated 'just for a minute' is how people get hit by a turret index or a spindle start from a bumped button or a program resume. The interlock exists because the machine can move without warning. The fix is to set up the machine properly for tool changes, not to bypass safety." },
      { text: "Let them finish this one since the spindle is stopped, then talk to them afterward.",
        result: "bad",
        feedback: "The turret can still index and axes can still move with the spindle stopped. Waiting is accepting the risk." },
      { text: "Tell them to be careful and keep their hands clear of the turret.",
        result: "bad",
        feedback: "'Be careful' isn't a safety control. The interlock is. Restore it." },
      { text: "Tell them to press E-stop before changing inserts with the door open.",
        result: "partial",
        feedback: "E-stop does stop all motion and is far safer than a live machine. But it isn't a substitute for a working interlock, and leaving the interlock defeated means the next person inherits a machine that will move with the door open. Restore the interlock and use the machine's proper setup mode." },
    ],
    whyItMatters: "Interlocks are not suggestions. If a task needs the door open, the machine has a mode for that. Defeating safety hardware is never the answer.",
  },
  {
    id: "ss-04",
    category: "safety",
    difficulty: 3,
    situation:
      "Proving out a new program. The operator has the rapid override at 100%, single block off, and is about to press cycle start on a program nobody has dry-run. The first tool is a boring bar and the part is already in the chuck.",
    options: [
      { text: "Stop before cycle start. First-run procedure: rapid override low (5 to 25%), single block on, feed hold ready, and a hand on the E-stop. Verify each tool's first approach move before letting it run. Consider a dry run with the part removed or the Z offset shifted out.",
        result: "best",
        feedback: "An unproven program at full rapid is how boring bars go through chucks. Every first run gets single block and low rapid until each tool has approached the part correctly. A crash at 25% rapid is a scratch; at 100% it's a spindle rebuild." },
      { text: "Run it at 100% but stand at the E-stop and watch.",
        result: "bad",
        feedback: "Human reaction time is around a quarter second. At full rapid the machine covers many inches in that time. You cannot out-react a crash." },
      { text: "Run it with single block on but leave rapid at 100%.",
        result: "partial",
        feedback: "Single block lets you check each line before it executes, which is a real improvement. But if you misjudge a move, it still executes at full rapid. Bring rapid down too." },
      { text: "Skip the boring bar for the first run and start with the second tool.",
        result: "bad",
        feedback: "Skipping tools changes the program flow and stock conditions and still doesn't prove the boring bar move, which is the one you're worried about. Prove the whole program in order, slowly." },
    ],
    whyItMatters: "Unproven programs run slow and stepwise until every tool has been watched into the cut. This is the discipline that separates near-misses from crashes.",
  },
  {
    id: "ss-05",
    category: "safety",
    difficulty: 3,
    situation:
      "A chuck jaw has been changed to a new set of soft jaws. The operator bored the jaws and is ready to run production at 3000 RPM. You notice the jaws are hanging about 0.75\" outside the chuck body diameter to reach the part, and the jaw bolts were the ones that came with the old jaws.",
    options: [
      { text: "Do not run at that speed yet. Jaws extending past the chuck body reduce grip force at speed and increase the chance of jaw or bolt failure. Verify the bolts are correct grade and length for these jaws, check the chuck's rated speed with jaws in this position, and reduce RPM accordingly.",
        result: "best",
        feedback: "Centrifugal force on jaws grows with the square of RPM and with how far the jaw mass is from center. Overhanging jaws throw the chuck's speed rating out the window. A jaw that lets go at 3000 RPM is a projectile. Chuck manufacturers publish speed reductions for jaw overhang, and bolts must be the right grade and thread engagement." },
      { text: "Run it, but increase chuck pressure to compensate for centrifugal loss.",
        result: "partial",
        feedback: "Higher pressure does offset centrifugal grip loss, and it's part of the calculation. But it doesn't address whether the jaws and bolts can physically survive at that speed and overhang. Check the ratings." },
      { text: "Run it at 3000; the jaws were bored on this chuck so they must be fine.",
        result: "bad",
        feedback: "Boring the jaws proves they're concentric, not that they're safe at speed. Those are unrelated." },
      { text: "Run a few parts slowly and if nothing bad happens, ramp up to 3000.",
        result: "bad",
        feedback: "Jaw and bolt failure is sudden, not gradual. 'Nothing happened at 1500' says nothing about 3000." },
    ],
    whyItMatters: "Chuck speed ratings assume standard jaws at standard positions. Any overhang, any non-standard hardware, and any doubt means look it up and slow down.",
  },

];

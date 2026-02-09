
export const APP_VERSION = "0.1.0-mvp";

/**
 * Hackathon Test Scenarios (Mental/Manual Test Plan)
 * Use these to verify Gemini performance:
 * 
 * 1.  Obstacle: "Cardboard box in the hallway center" -> Expect: "Box in center path. Step left."
 * 2.  Hazard: "Wet floor sign near mall entrance" -> Expect: "Wet floor ahead. Slow down."
 * 3.  Navigation: "Elevator doors opening" -> Expect: "Elevator doors opening ahead. Proceed."
 * 4.  Hazard: "Drop off / Stairs down" -> Expect: "Stairs down ahead. Handrail on right. Slow down."
 * 5.  Hazard: "Low hanging branch" -> Expect: "Overhead hazard. Slow down."
 * 6.  Object: "A chair partially blocking path" -> Expect: "Chair on right. Stay left."
 * 7.  Navigation: "Closed glass door" -> Expect: "Glass door ahead. Handle on right."
 * 8.  Crowd: "People walking towards user" -> Expect: "Crowded area. Slow down."
 * 9.  Traffic: "Car reversing from driveway" -> Expect: "HIGH RISK. Vehicle moving on right. STOP."
 * 10. Indoors: "Rug with curled edge" -> Expect: "Tripping hazard near center. Step right."
 * 11. Outdoors: "Uneven sidewalk tiles" -> Expect: "Uneven ground. Use caution."
 * 12. Public: "Crosswalk with red light" -> Expect: "Crosswalk ahead. Traffic light is red. Wait."
 * 13. Public: "Crosswalk with green light" -> Expect: "Crosswalk clear. Proceed."
 * 14. Object: "Dog leash across path" -> Expect: "Wire or leash at ground level. STOP."
 * 15. Navigation: "Tactile paving transition" -> Expect: "Tactile paving ahead. Approaching stairs or road."
 * 16. Indoors: "Kitchen counter corner" -> Expect: "Counter corner on left at waist height."
 * 17. Object: "Coffee cup on edge of table" -> Expect: "Spill risk. Object on edge of right table."
 * 18. Interaction: "Person waving" -> Expect: "Person ahead is gesturing towards you."
 * 19. Environment: "Dimly lit hallway" -> Expect: "Low light. Detection confidence reduced."
 * 20. Clear Path: "Empty long hallway" -> Expect: "Path seems clear. Proceed."
 */

Feature: Requirement 1 - Remove the Lift-Mate fitness application

The repository must no longer behave as a fitness application.

Scenario: Fitness features are removed
When the final source tree is inspected
Then no workout feature exists
And no exercise-selection feature exists
And no rep-counting feature exists
And no coaching feature exists
And no workout-progress feature exists
And no workout-playback feature exists
And no exercise-history feature exists

Scenario: Exercise implementations are removed
When the final source tree is inspected
Then src/exercises does not exist
And exercise-specific pose-analysis modules do not exist
And squat-specific logic does not exist
And bench-press-specific logic does not exist
And overhead-press-specific logic does not exist

Scenario: Exercise data is removed
When the final repository is inspected
Then ExRx exercise datasets do not exist
And duplicate ExRx datasets do not exist
And ExRx ingestion scripts do not exist
And ExRx-specific domain modules do not exist

Scenario: Fitness state is removed
When application state is inspected
Then workout state does not exist
And session state used only for workouts does not exist
And exercise-selection state does not exist
And coaching state does not exist
And rep-count state does not exist

Scenario: Fitness UI is removed
When application routes are inspected
Then no Home workout dashboard route exists
And no Playback route exists
And no Progress route exists
And no workout-specific navigation item exists

Scenario: Old fitness design material is removed
When repository support files are inspected
Then obsolete workout mockups are removed
And obsolete workout specifications are removed
And obsolete fitness planning documents are removed

---

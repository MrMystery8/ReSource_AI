# Requirements Document

## Introduction

This specification covers the expansion of the ReSource AI e-waste recycling application from a scanning/triage tool with basic gamification into a full recycling action platform. The expansion includes fixing the existing points animation bug, replacing free-text user context input with structured interactive fields, enhancing Safe Second Life Ideas with contextual relevance and reload capability, adding detailed implementation guides for recycling projects, introducing a contextual chatbot for project assistance, enabling project submission with AI-based grading, expanding user history to track recycling projects, and upgrading the AI model to Claude Sonnet 4.6.

## Glossary

- **ReSource_App**: The ReSource AI e-waste recycling web application comprising a React frontend, Node.js/TypeScript backend with Lambda handlers, and AWS infrastructure
- **Points_Animation**: The animated overlay component that displays points earned after completing a triage session
- **Triage_Form**: The initial input screen where users describe their e-waste device for AI analysis
- **User_Context_Input**: The structured input section on the Triage Form that captures user expertise, motivation, and material availability
- **Second_Life_Ideas**: AI-generated creative project suggestions for repurposing e-waste device components
- **Idea_Card**: A clickable UI card component that displays a single Safe Second Life Idea
- **Implementation_Guide**: A dedicated page showing detailed step-by-step instructions for completing a selected recycling project
- **Project_Chatbot**: A contextual chat interface on the Implementation Guide page that assists users with questions about their current recycling project
- **Project_Submission**: The feature allowing users to upload photos of their completed recycling project for AI evaluation
- **AI_Grader**: The backend service that analyzes submitted project photos and assigns a quality grade
- **Project_History**: The section of user history that tracks clicked, in-progress, and completed recycling projects
- **Bedrock_Client**: The backend service that communicates with AWS Bedrock for AI model invocations
- **Claude_Model**: The Claude Sonnet 4.6 model accessed via AWS Bedrock for text generation tasks

## Requirements

### Requirement 1: Points Animation Bug Fix

**User Story:** As a user, I want the points earned animation to display correctly and dismiss itself, so that it does not obstruct my view of the application content.

#### Acceptance Criteria

1. WHEN a triage session completes with points earned greater than 0, THE Points_Animation SHALL display the earned points value as a visible overlay for a maximum of 3 seconds (including entry and exit transitions) before automatically dismissing
2. WHILE the points animation is displayed, THE Points_Animation SHALL be positioned as an absolutely-positioned overlay within its parent container, using pointer-events: none so that underlying page content remains interactive and no layout reflow occurs on surrounding elements
3. WHEN the points animation exit transition completes, THE Points_Animation SHALL remove itself from the DOM and invoke the onComplete callback
4. IF the points animation has not dismissed within 3 seconds of becoming visible, THEN THE Points_Animation SHALL force-hide itself, remove itself from the DOM, and invoke the onComplete callback to reset the parent visibility state
5. WHILE the points animation is displayed, THE Points_Animation SHALL expose an accessible label announcing the points earned value to assistive technologies via an aria-live region

### Requirement 2: Structured User Context Input

**User Story:** As a user, I want to provide my expertise level, motivation, and material availability through structured interactive controls, so that the app can tailor recommendations to my specific situation.

#### Acceptance Criteria

1. THE Triage_Form SHALL display an expertise level selector with three options: Beginner, Intermediate, and Expert, using a segmented button group with no option pre-selected
2. THE Triage_Form SHALL display a motivation selector with options: Learn Something New, Environmental Impact, Save Money, and Creative Project, using a chip-select control that allows exactly one selection
3. THE Triage_Form SHALL display a material availability selector with options: Basic Household Tools, Some Electronics Tools, Full Workshop, using a segmented button group with no option pre-selected
4. THE Triage_Form SHALL display a time commitment selector with options: Under 1 Hour, 1-3 Hours, Half Day, and Multi-Day Project, using a dropdown control with a placeholder prompt and no default selection
5. THE Triage_Form SHALL require the user to select a value for expertise level, motivation, material availability, and time commitment before enabling the submit button
6. WHEN the user submits the Triage Form, THE Triage_Form SHALL include the selected values for expertiseLevel, motivation, materialAvailability, and timeCommitment in the session payload sent to the backend in place of the former free-text userContext field
7. THE Triage_Form SHALL retain the existing Device Identity and Failure Symptoms free-text fields unchanged
8. THE Triage_Form SHALL replace the free-text User Context field with the structured input controls described above

### Requirement 3: Enhanced Safe Second Life Ideas

**User Story:** As a user, I want Safe Second Life Ideas that are relevant to my expertise level and context, so that I receive actionable project suggestions I can realistically complete.

#### Acceptance Criteria

1. WHEN generating Second Life Ideas, THE ReSource_App SHALL pass the user context (expertise level, motivation, material availability, and time commitment) to the AI prompt so that generated ideas are tailored to the user's stated context
2. THE ReSource_App SHALL display exactly 3 Second Life Ideas as Idea Cards in a grid layout (single column on viewports narrower than 1024 pixels, three columns on viewports 1024 pixels or wider)
3. WHEN the user clicks an Idea Card, THE ReSource_App SHALL navigate to the Implementation Guide page for that idea
4. WHEN the user clicks the reload button, THE ReSource_App SHALL make a new API call to regenerate Second Life Ideas using the same session context (device identity, failure symptoms, user context, and prior stage outputs)
5. WHILE a reload request is in progress, THE ReSource_App SHALL display a loading indicator on the reload button and disable repeated clicks until the response is received or a timeout of 30 seconds elapses
6. WHEN fresh ideas are returned, THE ReSource_App SHALL replace the currently displayed Idea Cards with the new set of 3 ideas
7. IF the reload API call fails or times out, THEN THE ReSource_App SHALL display an error message indicating that new ideas could not be generated and SHALL retain the previously displayed Idea Cards
8. THE ReSource_App SHALL only display Second Life Ideas whose skill level does not exceed the user's stated expertise level, defaulting to Beginner if no expertise level is stated

### Requirement 4: Detailed Implementation Guide

**User Story:** As a user, I want to see detailed step-by-step instructions for a recycling project, so that I can confidently complete the project from start to finish.

#### Acceptance Criteria

1. WHEN the user clicks an Idea Card, THE ReSource_App SHALL navigate to a dedicated Implementation Guide page, passing the selected idea's title, description, required components, additional materials, and the session's structured user context (expertise level, material availability, time commitment)
2. WHEN the Implementation Guide page loads, THE ReSource_App SHALL make an API call to generate detailed instructions for the selected idea, including the session context and user expertise level in the request payload
3. WHEN the implementation guide content is received, THE Implementation_Guide SHALL display a list of between 3 and 15 required materials and tools for the project
4. WHEN the implementation guide content is received, THE Implementation_Guide SHALL display between 5 and 20 numbered step-by-step instructions, where Beginner-level instructions include explanations of terminology and tool usage, Intermediate-level instructions assume familiarity with basic tools and techniques, and Expert-level instructions use concise technical language without introductory explanations
5. WHEN the implementation guide content is received, THE Implementation_Guide SHALL display estimated time to complete the project as a specific range in minutes or hours
6. WHEN the implementation guide content is received, THE Implementation_Guide SHALL display at least one safety warning for each project component identified as having a safety concern, or display "No specific safety concerns" if none apply
7. WHILE the implementation guide content is loading, THE ReSource_App SHALL display a skeleton loading state
8. IF the API call to generate the implementation guide fails, THEN THE ReSource_App SHALL display an error message indicating the generation could not be completed and a retry button that re-sends the same request when clicked
9. IF the API call to generate the implementation guide does not return a response within 30 seconds, THEN THE ReSource_App SHALL abort the request, display a timeout error message, and offer a retry option

### Requirement 5: Contextual Project Chatbot

**User Story:** As a user, I want to ask questions about my current recycling project and receive helpful answers, so that I can get unstuck during implementation without leaving the guide page.

#### Acceptance Criteria

1. THE Implementation_Guide SHALL display a chatbot toggle button in the bottom-right corner of the page with a minimum touch target of 44x44 pixels
2. WHEN the user clicks the chatbot toggle, THE Project_Chatbot SHALL open as a popup panel overlaying the Implementation Guide, and WHEN the user clicks the toggle again or a close button within the panel, THE Project_Chatbot SHALL collapse back to the toggle button
3. WHEN the user sends a message of up to 500 characters, THE Project_Chatbot SHALL display a loading indicator and respond with answers scoped to the current recycling project context (selected idea, materials, steps, and device information) within 30 seconds
4. IF the user asks a question unrelated to the current recycling project, THEN THE Project_Chatbot SHALL respond with a message indicating it can only assist with the current project and suggest rephrasing
5. IF the Project_Chatbot fails to receive a response from the AI service within 30 seconds or the AI service returns an error, THEN THE Project_Chatbot SHALL display an error message indicating the request failed and allow the user to retry their last message
6. THE Project_Chatbot SHALL maintain conversation history of up to 50 messages within the current session on the Implementation Guide page
7. WHEN the user navigates away from the Implementation Guide page, THE Project_Chatbot SHALL clear its conversation history

### Requirement 6: Project Submission and AI Grading

**User Story:** As a user, I want to submit a photo of my completed recycling project and receive a grade with points, so that I am rewarded for completing projects and motivated to improve.

#### Acceptance Criteria

1. THE Implementation_Guide SHALL display a submission section where the user can upload multiple photos of their completed project, accepting JPEG, PNG, and WebP formats with a maximum file size of 5 MB per photo
2. THE Implementation_Guide SHALL require a minimum of 2 photos and allow up to 6 photos per submission
3. WHEN the user submits project photos, THE AI_Grader SHALL analyze all submitted images collectively against the expected project outcome from the implementation guide and return a result within 30 seconds
4. WHEN the AI_Grader completes analysis, THE AI_Grader SHALL assign a grade from A to F based on execution quality, creativity, and completeness
5. WHEN a grade is assigned, THE ReSource_App SHALL award points to the user based on the grade (A: 500 points, B: 350 points, C: 200 points, D: 100 points, F: 25 participation points)
6. WHEN points are awarded for a project submission, THE Points_Animation SHALL display the earned points
7. THE ReSource_App SHALL store the submission result (grade, points, photo references) in the user's project history
8. IF the image analysis fails or exceeds 30 seconds, THEN THE AI_Grader SHALL return an error message and allow the user to retry the submission up to 3 times
9. WHILE the AI_Grader is analyzing submitted photos, THE Implementation_Guide SHALL display a loading indicator and disable the submit button to prevent duplicate submissions
10. IF the user has already received a grade for the current project, THEN THE Implementation_Guide SHALL allow resubmission and replace the previous grade and points with the new result

### Requirement 7: User Project History

**User Story:** As a user, I want to see a record of my recycling projects including their status, so that I can track my progress and manage ongoing work.

#### Acceptance Criteria

1. THE Project_History SHALL display a paginated list (10 projects per page with a load-more control) of all recycling ideas the user has clicked on, showing for each entry: idea title, date started, and a status indicator (In Progress, Completed, or Abandoned)
2. THE Project_History SHALL display the existing triage session history alongside the project history in a tabbed layout with two tabs: "Projects" and "Triage Sessions"
3. WHEN the user clicks an in-progress project in the history, THE ReSource_App SHALL navigate to the Implementation Guide page for that project
4. WHEN the user clicks a completed project in the history, THE ReSource_App SHALL navigate to the Implementation Guide page for that project in a read-only view showing the submission result
5. WHEN the user clicks an "Abandon" action on an in-progress project, THE Project_History SHALL display a confirmation dialog, and upon user confirmation, mark the project as Abandoned and remove it from the In Progress section
6. WHEN the user clicks a "Delete" action on a project, THE Project_History SHALL display a confirmation dialog stating the action is permanent, and upon user confirmation, permanently remove the project record
7. IF the API call to load, abandon, or delete a project fails, THEN THE Project_History SHALL display an error message indicating the operation failed and allow the user to retry
8. THE Project_History SHALL display the grade (A through F) and points earned for completed projects alongside the project entry

### Requirement 8: AI Model Upgrade

**User Story:** As a developer, I want the application to use Claude Sonnet 4.6 via AWS Bedrock, so that the AI responses are higher quality and more contextually relevant.

#### Acceptance Criteria

1. THE Bedrock_Client SHALL use the Claude Sonnet 4.6 model identifier as the default model for all text generation requests, while the image generation model identifier SHALL remain unchanged
2. THE Bedrock_Client SHALL format text generation request payloads according to the Anthropic Messages API schema required by Claude models on Bedrock, including the anthropic_version field, a messages array, and inference parameters max_tokens set to 4096, top_p set to 0.9, and temperature set to 0.7
3. THE Bedrock_Client SHALL parse text generation response payloads by extracting the text value from the first content block in the Anthropic Messages API response structure
4. IF the Claude model response does not contain a text content block in the expected structure, THEN THE Bedrock_Client SHALL throw an error indicating an unexpected response format
5. WHEN the Claude model returns a transient error such as ThrottlingException or ServiceUnavailableException, THE Bedrock_Client SHALL retry the request once after the configured retry delay of 2000 milliseconds
6. THE Bedrock_Client SHALL maintain the existing request timeout of 60000 milliseconds and retry delay of 2000 milliseconds

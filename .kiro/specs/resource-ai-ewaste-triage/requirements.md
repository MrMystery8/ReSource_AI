# Requirements Document

## Introduction

ReSource AI is a web-based e-waste triage application that helps users safely assess discarded electronic devices for reusable components and second-life project ideas. The application implements a safety-first AI pipeline that analyzes device evidence, identifies hazards, maps reusable parts, and generates actionable recovery plans. It converts the existing PartyRock prototype into a production-grade AWS application with a web frontend, API backend, and orchestrated AI pipeline using Amazon Bedrock.

## Glossary

- **Triage_Pipeline**: The sequential chain of AI analysis stages that processes user inputs through eight ordered steps, where each stage receives outputs from all previous stages
- **Safety_Gate**: The second stage of the Triage_Pipeline that classifies device risk level and controls what information downstream stages may produce
- **Risk_Level**: A four-tier classification system (Green, Yellow, Orange, Red) indicating the safety risk of handling a device
- **Device_Evidence**: User-uploaded files (images or documents) providing visual or textual evidence about the device being assessed
- **Triage_Session**: A single end-to-end execution of the Triage_Pipeline for one device, encompassing all user inputs and generated outputs
- **Frontend**: The web-based user interface where users provide device information and view triage results
- **Backend_API**: The server-side REST API that receives user inputs, orchestrates the Triage_Pipeline, and returns results
- **File_Storage**: The S3-based storage service that holds uploaded Device_Evidence files
- **LLM_Service**: The Amazon Bedrock integration that executes AI model inference for each pipeline stage
- **Image_Generator**: The Amazon Bedrock image generation model that produces the ReSource Concept Visual
- **Pipeline_Orchestrator**: The backend component that executes Triage_Pipeline stages in sequence, passing accumulated context between stages

## Requirements

### Requirement 1: Device Evidence Upload

**User Story:** As a user, I want to upload photos or documents of my e-waste device, so that the AI can use visual evidence to improve its triage assessment.

#### Acceptance Criteria

1. THE Frontend SHALL provide a file upload control that accepts image files (.jpg, .jpeg, .png, .webp, .gif) and document files (.pdf, .docx, .pptx, .html, .csv, .json)
2. WHEN a user uploads a file, THE Backend_API SHALL store the file in File_Storage, return a reference identifier, and associate it with the current triage session, up to a maximum of 5 files per triage session
3. IF an uploaded file exceeds 10 MB in size, THEN THE Backend_API SHALL reject the upload and return an error message indicating the size limit has been exceeded
4. IF a file upload is rejected due to unsupported format or size exceeded, THEN THE Backend_API SHALL return an error message specifying the reason for rejection
5. THE Frontend SHALL indicate that Device_Evidence upload is optional and the triage can proceed without it
6. IF File_Storage is unavailable when a user uploads a file, THEN THE Backend_API SHALL return an error message indicating the upload could not be completed and SHALL NOT mark the triage session as failed

### Requirement 2: Device Information Input

**User Story:** As a user, I want to describe my device's identity, failure symptoms, and my goals, so that the AI has sufficient context to perform an accurate triage.

#### Acceptance Criteria

1. THE Frontend SHALL provide a text input field for Device Identity and Visible Parts (required, maximum 2000 characters)
2. THE Frontend SHALL provide a text input field for Failure and Safety Symptoms (required, maximum 2000 characters)
3. THE Frontend SHALL provide a text input field for User Context and Goal (required, maximum 2000 characters)
4. THE Frontend SHALL display placeholder hints for each text input field demonstrating expected input format
5. WHEN a user submits the form with any required field empty or containing only whitespace, THE Frontend SHALL display a validation error identifying the empty field and prevent submission
6. WHEN all required fields are populated with non-whitespace content, THE Frontend SHALL enable the submission action
7. THE Frontend SHALL display a live character count for each text input field showing the current count relative to the 2000-character maximum

### Requirement 3: Triage Pipeline Orchestration

**User Story:** As a user, I want the system to process my device information through a structured AI pipeline, so that I receive comprehensive, safety-aware triage results.

#### Acceptance Criteria

1. WHEN a user submits a triage request, THE Pipeline_Orchestrator SHALL execute the eight pipeline stages in this fixed order: Quick ReSource Verdict, Safety Gate, Detailed Resource Analysis, Reusable Parts Map, Safe Second Life Ideas, Safe Next Steps and Recovery Route, ReSource Impact Card, ReSource Concept Visual
2. THE Pipeline_Orchestrator SHALL pass all user inputs (Device Identity and Visible Parts, Failure and Safety Symptoms, User Context and Goal, and optional Device_Evidence reference) to the first stage (Quick ReSource Verdict)
3. THE Pipeline_Orchestrator SHALL pass all user inputs plus all preceding stage outputs to each subsequent stage
4. IF a pipeline stage fails, THEN THE Pipeline_Orchestrator SHALL halt execution of remaining stages and return an error response indicating which stage failed and a description of the failure reason
5. IF the Pipeline_Orchestrator does not complete all eight stages within 120 seconds, THEN THE Pipeline_Orchestrator SHALL abort the remaining stages and return a timeout error response indicating the last stage that was attempted
6. WHEN the Pipeline_Orchestrator begins processing, THE Backend_API SHALL return a session identifier that the Frontend can use to poll for results
7. WHEN the Frontend polls for results, THE Backend_API SHALL return the current pipeline state (in-progress with the name of the currently executing stage, completed with all stage outputs, or failed with error details)

### Requirement 4: Quick ReSource Verdict Generation

**User Story:** As a user, I want a fast initial triage verdict, so that I can immediately understand the device's salvage potential and safety risk.

#### Acceptance Criteria

1. WHEN the Quick ReSource Verdict stage executes, THE LLM_Service SHALL produce a structured response containing: device identification, confidence level, Risk_Level (Green/Yellow/Orange/Red), salvage potential score (1-5, where 1 is lowest salvage potential and 5 is highest), recommended best next step, safety warning, a top reusable resources list of 3 to 5 items, and missing information notes
2. THE LLM_Service SHALL assign a Risk_Level based solely on evidence provided by the user
3. IF the user provides no Device_Evidence files and fewer than 50 characters of device description in any required text field, THEN THE LLM_Service SHALL assign a Risk_Level one tier more conservative than the evidence suggests (Yellow becomes Orange, Orange becomes Red), defaulting to Red when no evidence supports a classification
4. THE LLM_Service SHALL express confidence as a qualitative descriptor (high, moderate, low) rather than a numeric percentage, where high indicates all key device attributes are identifiable from the provided evidence, moderate indicates some attributes are inferred, and low indicates the majority of attributes are assumed

### Requirement 5: Safety Gate Classification

**User Story:** As a user, I want the system to perform a dedicated safety assessment, so that all subsequent recommendations respect the identified hazards.

#### Acceptance Criteria

1. WHEN the Safety Gate stage executes, THE LLM_Service SHALL produce a structured response containing: Risk_Level, a list of identified hazards (at least 1), actions the user must not perform, actions that are safe, conditions under which the user should stop, and a recommended safe next step
2. THE Safety_Gate SHALL classify the device into exactly one Risk_Level: Green (low risk, external components only), Yellow (caution, simple internal parts), Orange (supervised handling only), or Red (do not open, professional recovery required)
3. WHEN the Safety_Gate assigns Risk_Level Red, THE Pipeline_Orchestrator SHALL instruct all downstream stages to exclude recommendations for internal component reuse
4. IF information about the device's condition or internal state is incomplete, THEN THE Safety_Gate SHALL default to the next higher Risk_Level (e.g., Green becomes Yellow) rather than assuming the lower risk
5. IF the LLM_Service returns a response missing the Risk_Level field or containing a Risk_Level value outside the defined set (Green, Yellow, Orange, Red), THEN THE Safety_Gate SHALL reject the response, default to Risk_Level Red, and indicate to the user that a safety classification could not be confirmed

### Requirement 6: Detailed Resource Analysis

**User Story:** As a user, I want a detailed diagnostic analysis of my device, so that I understand what components it likely contains and their condition.

#### Acceptance Criteria

1. WHEN the Detailed Resource Analysis stage executes, THE LLM_Service SHALL produce a response containing: probable device identity, component profile (listing likely internal and external components with their function), failure pattern analysis, diagnostic verdict, condition scores for each identified component on a scale of 1 to 5 (where 1 is non-functional and 5 is fully functional), and a verdict summary of no more than 30 words
2. THE LLM_Service SHALL limit the Detailed Resource Analysis response to 350 words maximum
3. IF the Safety_Gate Risk_Level is Red, THEN THE LLM_Service SHALL exclude all internal components from the component profile and condition scores, limiting analysis to externally visible parts only
4. IF the Safety_Gate Risk_Level is Orange, THEN THE LLM_Service SHALL flag internal components in the component profile as requiring supervised handling and not recommend direct user access to those components

### Requirement 7: Reusable Parts Map

**User Story:** As a user, I want a structured table of reusable parts, so that I can identify which components are worth salvaging and what skills are needed.

#### Acceptance Criteria

1. WHEN the Reusable Parts Map stage executes, THE LLM_Service SHALL produce a table with columns: Part/Resource (component name), Likely Presence (one of: Confirmed, Probable, Uncertain), Reuse Value (one of: High, Medium, Low, None), Possible Use (brief description of reuse application), Skill Needed (one of: Beginner, Intermediate, Advanced, Professional), Safety Concern (description of associated hazard or "None"), and Verdict (one of: Salvage, Conditional, Do Not Access)
2. THE LLM_Service SHALL include between 6 and 10 rows in the Reusable Parts Map
3. IF the Safety_Gate Risk_Level is Red, THEN THE LLM_Service SHALL mark all components that require opening the device enclosure with a Verdict of "Do Not Access" and a Skill Needed of "Professional" in the Reusable Parts Map
4. THE LLM_Service SHALL assign Skill Needed values that do not exceed the user's stated skill level from User Context and Goal for any row with a Verdict of "Salvage"
5. IF the Safety_Gate Risk_Level is Orange, THEN THE LLM_Service SHALL mark components requiring opening the device enclosure with a Verdict of "Conditional" and a Safety Concern describing the required supervision or precaution

### Requirement 8: Safe Second Life Ideas

**User Story:** As a user, I want creative project ideas for reusing my device's components, so that I can give the device a meaningful second life.

#### Acceptance Criteria

1. WHEN the Safe Second Life Ideas stage executes, THE LLM_Service SHALL produce exactly three project ideas categorized as: beginner, STEM/learning, and practical/creative, where each idea includes a project title, a brief description, a list of required components from the device, and a list of additional materials or tools needed
2. THE LLM_Service SHALL limit each project idea to 90 words maximum
3. THE LLM_Service SHALL only suggest projects that are achievable within the user's stated skill level and available tools as provided in the User Context and Goal input
4. IF the User Context and Goal input does not specify a skill level or available tools, THEN THE LLM_Service SHALL default to beginner-level projects requiring only basic household tools
5. IF the Safety_Gate Risk_Level is Red, THEN THE LLM_Service SHALL only suggest projects using components accessible without opening or disassembling the device
6. THE LLM_Service SHALL only reference components that were identified in the Reusable Parts Map stage output

### Requirement 9: Safe Next Steps and Recovery Route

**User Story:** As a user, I want a clear action plan, so that I know exactly what to do next with my device safely.

#### Acceptance Criteria

1. WHEN the Safe Next Steps stage executes, THE LLM_Service SHALL produce a response containing: safe first actions (3 to 5 ordered steps), parts to keep or reuse, parts to avoid, overall recommendation, trash warnings, and a local recovery note referencing e-waste recycling or certified recovery options available in the user's region
2. THE LLM_Service SHALL limit the Safe Next Steps response to 300 words maximum
3. THE LLM_Service SHALL ensure all recommended actions comply with the Safety_Gate classification by restricting recommendations to actions within the permitted handling tier: Green allows external and simple internal access, Yellow allows cautious internal access to simple parts, Orange allows supervised handling only, and Red allows external inspection only with no disassembly
4. WHEN the Safety_Gate Risk_Level is Red, THE LLM_Service SHALL exclude any next steps that involve opening the device or accessing internal components, and SHALL direct the user to professional e-waste recovery services
5. THE LLM_Service SHALL include warnings about components that should not be handled by the user, identifying each hazardous component referenced in the Safety_Gate output and stating the specific risk (e.g., chemical exposure, electrical shock, sharp edges)

### Requirement 10: ReSource Impact Card

**User Story:** As a user, I want a concise summary card of the entire triage, so that I can save or share the key findings.

#### Acceptance Criteria

1. WHEN the ReSource Impact Card stage executes, THE LLM_Service SHALL produce a summary containing exactly 11 structured fields: Device Name, Risk Level, Salvage Score, Top Reusable Part, Best Second Life Idea, Skill Level Required, Safety Warning, Recommended Action, Environmental Impact Note, Recovery Difficulty, and Overall Verdict
2. THE LLM_Service SHALL limit the ReSource Impact Card to 120 words maximum, counting only field values and excluding field labels from the word count
3. THE LLM_Service SHALL format the ReSource Impact Card as a labeled list with each field on its own line, using the field name followed by a colon and a value of no more than 15 words per field
4. WHEN the Safety_Gate Risk_Level is Red, THE LLM_Service SHALL ensure the ReSource Impact Card excludes recommendations for internal component access and reflects professional recovery as the recommended action

### Requirement 11: ReSource Concept Visual Generation

**User Story:** As a user, I want a generated image showing the safest outcome for my device, so that I can visualize the recommended second-life project or recovery concept.

#### Acceptance Criteria

1. WHEN the ReSource Concept Visual stage executes, THE Image_Generator SHALL produce a single PNG image at 1024x1024 pixels depicting either the safest second-life project concept or a certified recovery concept
2. THE Image_Generator SHALL select the concept based on the Safety Gate Risk_Level: if Green, Yellow, or Orange, depict the best safe second-life project from Safe Second Life Ideas; if Red, depict a professional recovery or recycling concept
3. WHEN the Safety_Gate Risk_Level is Red, THE Image_Generator SHALL depict a professional recovery or recycling concept rather than a DIY project
4. THE Backend_API SHALL store the generated image in File_Storage and return a pre-signed URL accessible to the Frontend for a minimum of 1 hour
5. IF the Image_Generator fails to produce an image, THEN THE Backend_API SHALL return a placeholder indicator and SHALL NOT mark the entire Triage_Session as failed

### Requirement 12: Results Presentation

**User Story:** As a user, I want to view all triage results in a clear, organized interface, so that I can understand and act on the AI's recommendations.

#### Acceptance Criteria

1. THE Frontend SHALL display each pipeline stage output in a distinct section labeled with the stage name (Quick ReSource Verdict, Safety Gate, Detailed Resource Analysis, Reusable Parts Map, Safe Second Life Ideas, Safe Next Steps and Recovery Route, ReSource Impact Card, ReSource Concept Visual) in the order they were generated
2. THE Frontend SHALL display the Risk_Level using color-coded indicators (Green, Yellow, Orange, Red)
3. THE Frontend SHALL render the Reusable Parts Map as a table with columns: Part/Resource, Likely Presence, Reuse Value, Possible Use, Skill Needed, Safety Concern, and Verdict
4. THE Frontend SHALL display the ReSource Concept Visual as an inline image scaled to fit within the content area without exceeding 800 pixels in width
5. WHILE the Triage_Pipeline is processing, THE Frontend SHALL display a progress indicator showing which stage is currently executing and SHALL display each stage's results in its labeled section as soon as that stage completes
6. IF a pipeline stage fails, THEN THE Frontend SHALL display an error message indicating which stage failed in place of that stage's results section while preserving and displaying all successfully completed stage outputs

### Requirement 13: Backend API Design

**User Story:** As a developer, I want a well-structured REST API, so that the frontend can reliably submit triage requests and retrieve results.

#### Acceptance Criteria

1. THE Backend_API SHALL expose a POST endpoint for submitting a new Triage_Session that accepts the three required text fields (Device Identity and Visible Parts, Failure and Safety Symptoms, User Context and Goal) and an optional file reference, and SHALL return a session identifier upon successful creation
2. THE Backend_API SHALL expose a GET endpoint for retrieving Triage_Session results by session identifier, and the response SHALL include a status field indicating the current session state (processing, complete, or failed) along with available stage outputs
3. THE Backend_API SHALL expose a POST endpoint for uploading Device_Evidence files that accepts files up to 10 MB in the supported formats defined in Requirement 1
4. THE Backend_API SHALL return HTTP status codes: 201 for successful resource creation, 200 for successful retrieval, 400 for validation errors, 404 for non-existent session identifiers, 413 for file size exceeded, and 500 for internal errors
5. WHEN the Backend_API returns an error response (4xx or 5xx), THE Backend_API SHALL include a response body containing an error indicator describing the failure reason
6. THE Backend_API SHALL validate all incoming request payloads against defined schemas before processing, rejecting requests that do not conform to the expected field types, required fields, and character limits specified in Requirement 2
7. IF a GET request references a session identifier that does not exist, THEN THE Backend_API SHALL return a 404 status code with an error indicator that the session was not found

### Requirement 14: Infrastructure and Deployment

**User Story:** As a developer, I want the application deployed on AWS with infrastructure as code, so that it is reproducible, scalable, and maintainable.

#### Acceptance Criteria

1. THE Infrastructure SHALL be defined using AWS CDK or AWS SAM such that the entire stack is deployable to a new AWS account using a single CLI command without manual console steps
2. THE Infrastructure SHALL provision an S3 bucket for File_Storage with access policies that restrict read and write operations to only the Backend_API compute role and deny public access
3. THE Infrastructure SHALL provision Amazon Bedrock model access for both text generation and image generation by granting the Backend_API compute role invoke permissions on the configured model resources
4. THE Infrastructure SHALL provision a compute service (AWS Lambda or AWS App Runner) to host the Backend_API
5. THE Infrastructure SHALL provision a content delivery mechanism (CloudFront or S3 static hosting) for the Frontend
6. THE Infrastructure SHALL configure IAM roles granting only the permissions required for each service's defined interactions, with no wildcard resource ARNs and no actions beyond those used by the application
7. WHEN the stack deployment completes, THE Infrastructure SHALL output the Backend_API endpoint URL and the Frontend access URL so that dependent services and testers can discover them without inspecting the AWS console

### Requirement 15: Security and Data Handling

**User Story:** As a user, I want my uploaded device information handled securely, so that my data is protected and not retained longer than necessary.

#### Acceptance Criteria

1. THE Backend_API SHALL authenticate requests using API keys or AWS Cognito tokens
2. IF a request lacks a valid API key or a valid AWS Cognito token, THEN THE Backend_API SHALL reject the request and return an error indicating authentication failure without processing the request body
3. THE File_Storage SHALL encrypt all stored files at rest using AWS-managed encryption keys
4. THE Backend_API SHALL enforce HTTPS for all client-server communication
5. IF a request is received over plain HTTP, THEN THE Backend_API SHALL reject the connection and not process the request
6. THE File_Storage SHALL apply a lifecycle policy to delete uploaded files after 24 hours from the time of upload
7. THE Backend_API SHALL sanitize all user text inputs by stripping or escaping characters that could be interpreted as injection commands (including prompt injection sequences, SQL metacharacters, and script tags) before passing them to the LLM_Service
8. THE Backend_API SHALL reject user text inputs exceeding 5000 characters and return an error indicating the input length limit was exceeded

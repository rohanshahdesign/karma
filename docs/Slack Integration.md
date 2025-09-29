# Slack Integration

## OAuth Onboarding Flow
- Offer Slack OAuth alongside existing signup options.
- On consent, store Slack team ID, user ID, email, and issued tokens.
- Create or update the internal user profile, recording a `SlackIdentity` entry that links provider details to the user.
- Allow Slack to be linked post-signup so the same `SlackIdentity` structure handles late connections.

## Workspace Association
- Map each Slack team (`slack_team_id`) to a Karma workspace.
- When the first Slack admin connects, either create a workspace or prompt for linking to an existing one.
- Persist the mapping on the workspace record, enabling fan-out of Slack events to the correct workspace context.
- Sync Slack memberships by storing `SlackMembership` rows tying `slack_user_id` to workspace members.

## Slash Commands and API Triggering
- Define slash commands (e.g., `/send-karma`) with Slack pointing to a signed endpoint.
- When invoked, resolve the Slack user via `SlackIdentity`, ensuring they belong to the linked workspace.
- Parse command payloads to identify recipients by Slack ID, translating them to workspace users before calling internal APIs.
- If a recipient lacks a Slack link, respond with guidance to connect or fall back to in-app notifications.

## Multi-Provider Accounts
- Support multiple authentication providers per user by storing identity rows per provider.
- Avoid relying on matching emails between Slack and other providers; treat mismatched emails as normal.
- Offer a confirmation flow for users who connect Slack after Google login, ensuring deliberate association to the correct profile.
- Permit admins to manually resolve ambiguous mappings when automated matching fails.

## Security and Maintenance
- Rotate and refresh Slack tokens as required, storing them encrypted.
- Verify Slack request signatures for all inbound commands and events.
- Implement revocation flows so users or admins can disconnect Slack identities without deleting the profile.
- Audit command usage, logging Slack IDs alongside resolved user IDs for traceability.

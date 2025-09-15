# Test Messages for Luigi Maintenance Agent

This document contains test messages organized by scenario to validate the agent's functionality according to the prompt requirements.

## 1. Complete Requests (Should process immediately)

### Electrical Issues
- **Test 1.1**: "Lamp broken in room 303, need new lightbulb"
- **Test 1.2**: "Power outlet not working in room 205, guests can't charge devices"
- **Test 1.3**: "Ceiling light flickering in room 401, might be dangerous"
- **Test 1.4**: "No electricity in room 102, complete power outage"

### Plumbing Issues
- **Test 1.5**: "Toilet flush not working in room 205, waste stays in bowl, need unclogging"
- **Test 1.6**: "Sink faucet leaking in room 301, water dripping continuously"
- **Test 1.7**: "Shower has no hot water in room 404"
- **Test 1.8**: "Toilet is overflowing in room 203, emergency!"

### Food & Beverage Requests
- **Test 1.9**: "Bring sparkling water to room 101"
- **Test 1.10**: "Mini bar empty in room 305, need restocking"
- **Test 1.11**: "Guest in room 202 wants 2 bottles of red wine delivered"
- **Test 1.12**: "Need fresh coffee pods for room 501"

### Structural/Blacksmith Issues
- **Test 1.13**: "Door lock broken in room 302, guests can't enter"
- **Test 1.14**: "Window won't close in room 403, security issue"
- **Test 1.15**: "Balcony door handle came off in room 504"
- **Test 1.16**: "Safe not opening in room 201, guests locked out"

### Reception Issues
- **Test 1.17**: "Guest in room 301 has questions about checkout policy"
- **Test 1.18**: "Room 404 guest wants to extend stay, need reception help"

## 2. Incomplete Requests (Should ask for clarification)

### Missing Room Number
- **Test 2.1**: "bring a coke zero"
- **Test 2.2**: "toilet is clogged"
- **Test 2.3**: "lights not working"
- **Test 2.4**: "need more towels"
- **Test 2.5**: "air conditioning broken"

### Vague Descriptions
- **Test 2.6**: "bring tape to room 303"
- **Test 2.7**: "something wrong with room 205"
- **Test 2.8**: "room 401 has issues"
- **Test 2.9**: "fix the thing in room 102"
- **Test 2.10**: "problem in bathroom of room 301"

### Unclear Specifics
- **Test 2.11**: "bring water to room 303"
- **Test 2.12**: "need tools for room 205"
- **Test 2.13**: "bring drinks to room 401"
- **Test 2.14**: "room 501 needs supplies"
- **Test 2.15**: "repair needed in room 204"

## 3. Follow-up Clarifications (Multi-turn conversations)

### Test 3.1 - Water Type Clarification
- **Message 1**: "bring water to room 303"
- **Expected Response**: "What type of water - still, sparkling, or bottled?"
- **Message 2**: "sparkling water please"
- **Expected**: Should process as complete request

### Test 3.2 - Tape Type Clarification
- **Message 1**: "bring tape to room 303"
- **Expected Response**: "What type of tape do you need and what will it be used for?"
- **Message 2**: "duct tape to fix a loose carpet edge"
- **Expected**: Should process as complete request

### Test 3.3 - Room Number Clarification
- **Message 1**: "toilet is clogged"
- **Expected Response**: "Which room has the clogged toilet?"
- **Message 2**: "room 205"
- **Expected**: Should process as complete request

### Test 3.4 - Problem Details Clarification
- **Message 1**: "something wrong with room 205"
- **Expected Response**: Should ask for specific details about what's wrong
- **Message 2**: "the door won't lock properly"
- **Expected**: Should process as blacksmith request

## 4. Specialist Assignment Tests

### Test 4.1 - Housekeeper Specifies Specialist
- **Test 4.1a**: "call the plumber for room 301, sink is leaking"
- **Test 4.1b**: "get the electrician to room 205, power is out"
- **Test 4.1c**: "need the blacksmith in room 404, door won't close"
- **Test 4.1d**: "contact food service for room 101, mini bar empty"

## 5. Ticket Update Scenarios

### Test 5.1 - Work Completion Updates
- **Message**: "the electrician fixed the lamp in room 303"
- **Expected**: Should find existing ticket and update with completion status

### Test 5.2 - Progress Updates
- **Message**: "plumber is working on room 205 toilet, needs more time"
- **Expected**: Should update existing ticket with progress information

### Test 5.3 - Additional Issues
- **Message**: "electrician found more problems in room 303, also needs to fix outlet"
- **Expected**: Should update existing ticket with additional details

### Test 5.4 - Resolution Confirmation
- **Message**: "room 301 door lock is fixed, guests can access now"
- **Expected**: Should close the ticket and update with resolution

## 6. Duplicate Request Prevention Tests

### Test 6.1 - Same Room, Same Issue
- **Setup**: Create ticket for "toilet clog in room 205"
- **Test Message**: "toilet still not working in room 205"
- **Expected**: Should identify existing ticket and inform about current status

### Test 6.2 - Same Room, Different Issue
- **Setup**: Create ticket for "lamp broken in room 303"
- **Test Message**: "air conditioning not working in room 303"
- **Expected**: Should create new ticket for different issue

### Test 6.3 - Different Room, Same Issue
- **Setup**: Create ticket for "toilet clog in room 205"
- **Test Message**: "toilet clogged in room 206"
- **Expected**: Should create new ticket for different room

## 7. Edge Cases and Error Handling

### Test 7.1 - Urgent/Emergency Requests
- **Test 7.1a**: "URGENT: Water flooding room 201 from broken pipe!"
- **Test 7.1b**: "EMERGENCY: Guest locked out of room 305, no key working"
- **Test 7.1c**: "Fire hazard: electrical sparking in room 403"

### Test 7.2 - Multiple Issues in One Message
- **Test 7.2a**: "room 301 has broken lamp and clogged toilet"
- **Test 7.2b**: "room 205 needs mini bar restocking and door lock repair"

### Test 7.3 - Ambiguous Specialist Assignment
- **Test 7.3a**: "room 404 has water damage on electrical outlet"
- **Test 7.3b**: "mini bar door won't close in room 302"

### Test 7.4 - Invalid Room Numbers
- **Test 7.4a**: "toilet broken in room 999"
- **Test 7.4b**: "lamp needs fixing in room ABC"

## 8. Conversation Flow Tests

### Test 8.1 - Polite Requests
- **Test 8.1a**: "Hi Luigi, could you please help with room 301? The lamp is not working."
- **Test 8.1b**: "Hello, I need assistance with room 205. The toilet won't flush properly."

### Test 8.2 - Informal Requests
- **Test 8.2a**: "hey, room 303 lamp is busted"
- **Test 8.2b**: "yo, need someone to fix the sink in 401"

### Test 8.3 - Detailed Requests
- **Test 8.3a**: "Good morning Luigi, I'm reporting an issue in room 501. The guest complained that the bathroom sink faucet is dripping constantly and making noise throughout the night. Could you please send a plumber to fix this as soon as possible?"

## 9. Status Inquiry Tests

### Test 9.1 - Status Check Requests
- **Test 9.1a**: "what's the status on the room 301 lamp repair?"
- **Test 9.1b**: "is anyone coming to fix the toilet in room 205?"
- **Test 9.1c**: "when will the electrician arrive at room 303?"

## 10. Tool Availability Tests

### Test 10.1 - Tool Failure Scenarios
These tests should be run when tools are intentionally disabled to test error handling:
- **Test 10.1a**: "lamp broken in room 303" (with send_message tool disabled)
- **Test 10.1b**: "toilet clogged in room 205" (with get_person tool disabled)

## Expected Agent Behaviors Summary

For each test category, the agent should:

1. **Complete Requests**: Check for existing tickets → Get specialist info → Send message → Create ticket → Confirm with housekeeper
2. **Incomplete Requests**: Ask specific clarifying questions and wait for response
3. **Follow-up Clarifications**: Process additional information and complete the workflow
4. **Specialist Assignment**: Respect housekeeper's specialist choice when specified
5. **Ticket Updates**: Find existing tickets and update with cumulative information
6. **Duplicate Prevention**: Check existing tickets before creating new ones
7. **Edge Cases**: Handle urgent requests appropriately and ask for clarification on ambiguous cases
8. **All Scenarios**: Maintain Luigi's helpful, professional tone throughout

## Testing Notes

- Each test should verify proper tool usage in sequence
- Confirm ticket creation/updates include all required fields
- Verify WhatsApp message format matches the specified template
- Check that duplicate prevention works correctly
- Ensure error handling when tools are unavailable
- Validate that the agent maintains context across multi-turn conversations

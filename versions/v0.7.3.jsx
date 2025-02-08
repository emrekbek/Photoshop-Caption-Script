// ===== AutoResizePlaceAndTextMultiParagraph.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Displays a custom multiline ScriptUI dialog to paste your ChatGPT output.
// 7. Replaces newline characters with carriage returns (so Photoshop shows multiple paragraphs).
// 8. Creates a text box in the visible black area with dynamic margins.
// 9. Optionally auto-adjusts the font size so the text fits within the text box.
// 10. Converts the text layer to a smart object.
// 11. Resizes the smart object (keeping its left and top edges fixed) until its bottom edge is exactly 0.025 × canvas height above the bottom.
// 12. Adjusts the canvas width (from the right side) so that the right edge of the canvas is 0.025 × (width of visible black area) away from the smart object.

(function() {
    // ---------- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;

    // ---------- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");

    // ---------- Step 3. Resize the canvas.
    // New canvas dimensions: width = 3 × original width, height remains the same.
    // Anchor at TOPLEFT so the image remains at the top-left.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

    // ---------- Step 4. Process the image layer.
    // If the current layer is a background (locked) layer, duplicate it so it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }

    // Move the image layer so that its top-left corner is at (0,0).
    var bounds = imageLayer.bounds; // returns [left, top, right, bottom]
    var deltaX = -bounds[0].as("px");
    var deltaY = -bounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);

    // ---------- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);

    // ---------- Step 6. Get the ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];

        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust the size as needed

        var buttonGroup = dlg.add("group");
        buttonGroup.alignment = "right";
        var okButton = buttonGroup.add("button", undefined, "OK");

        okButton.onClick = function() {
            dlg.close();
        };

        dlg.show();
        return inputField.text;
    }

    var chatGPTOutput = getChatGPTOutput();
    if (chatGPTOutput === "") {
        chatGPTOutput = "No output provided.";
    } else {
        // Replace newline characters with carriage returns so Photoshop recognizes paragraph breaks.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }

    // ---------- Step 7. Create a text box with dynamic margins in the visible black area.
    // The visible black area is the right 2×origWidth of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);

    // Calculate the text box position and size.
    var textX = origWidth + marginHoriz;                // X position inside the black area
    var textY = marginVert;                             // Y position (from the top)
    var textWidth = (2 * origWidth) - (2 * marginHoriz);  // Available width inside the black area
    var textHeight = origHeight - (2 * marginVert);       // Available height

    // Create a new text layer.
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;

    // Set the text box's position and dimensions.
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");

    // ---------- Optional: Set initial text formatting.
    textLayer.textItem.font = "ArialMT"; // Change to your desired font.
    textLayer.textItem.size = new UnitValue(24, "px"); // Initial font size.
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // ---------- Optional: Function to adjust the font size so that the text fits inside the text box.
    function adjustFontSizeToFit(layer, maxWidth, maxHeight) {
        var currentSize = parseFloat(layer.textItem.size.as("px"));
        var decrement = 1; // Decrease font size by 1px per iteration.

        // Get the current rendered text bounds.
        var b = layer.bounds;  // Returns [left, top, right, bottom]
        var renderedWidth = b[2].as("px") - b[0].as("px");
        var renderedHeight = b[3].as("px") - b[1].as("px");

        // Loop until the text fits within the specified dimensions.
        while ((renderedWidth > maxWidth || renderedHeight > maxHeight) && currentSize > decrement) {
            currentSize -= decrement;
            layer.textItem.size = new UnitValue(currentSize, "px");
            b = layer.bounds;
            renderedWidth = b[2].as("px") - b[0].as("px");
            renderedHeight = b[3].as("px") - b[1].as("px");
        }
    }

    // Call the function to adjust the font size if needed.
    adjustFontSizeToFit(textLayer, textWidth, textHeight);

    // ---------- Additional Steps:
    // Step A: Convert the text layer into a Smart Object.
    // ---------------------------------------------
    // Make sure the text layer is active.
    doc.activeLayer = textLayer;
    
    // Function to convert the active layer to a Smart Object.
    function convertLayerToSmartObject() {
        var idnewPlacedLayer = stringIDToTypeID("newPlacedLayer");
        executeAction(idnewPlacedLayer, undefined, DialogModes.NO);
    }
    convertLayerToSmartObject();
    
    // Now, the active layer is the Smart Object.
    var smartObj = doc.activeLayer;
    
    // Step B: Resize the Smart Object while maintaining its left and top borders.
    // We want its bottom border to be exactly 0.025 × canvas height above the canvas bottom.
    // Since the smart object’s top is at textY (which is marginVert),
    // the desired new height becomes: 
    //    desiredHeight = (canvas height - bottom margin) - top position
    //                  = (origHeight - marginVert) - marginVert
    //                  = origHeight - 2 * marginVert.
    var smartBounds = smartObj.bounds;
    var currentSmartHeight = smartBounds[3].as("px") - smartBounds[1].as("px");
    var desiredSmartHeight = origHeight - 2 * marginVert;
    
    // Calculate the scale factor (in percentage) required to achieve the desired height.
    var scaleFactor = (desiredSmartHeight / currentSmartHeight) * 100;
    
    // Resize the smart object. Anchor at TOPLEFT to keep the left and top positions unchanged.
    smartObj.resize(scaleFactor, scaleFactor, AnchorPosition.TOPLEFT);
    
    // Step C: Adjust the canvas width from the right side.
    // After resizing the smart object, its right border is:
    smartBounds = smartObj.bounds;
    var objectRight = smartBounds[2].as("px");
    
    // The visible black area (to the right of the image) originally spans 2×origWidth.
    // We want the right border of the canvas to be:
    //    objectRight + (0.025 × (width of visible black area)).
    // Since the visible black area width = 2 × origWidth, the desired right margin is:
    var desiredRightMargin = 0.025 * (2 * origWidth); // equivalent to 0.05 * origWidth
    
    var newCanvasWidth = objectRight + desiredRightMargin;
    
    // Resize the canvas width while keeping the top-left anchor.
    doc.resizeCanvas(new UnitValue(newCanvasWidth, "px"), doc.height, AnchorPosition.TOPLEFT);
    
    alert("All steps completed:\n• Image repositioned and background filled\n• Multi-paragraph text box created and auto-adjusted\n• Text layer converted to Smart Object and resized\n• Canvas width adjusted accordingly!");
})();

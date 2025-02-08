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
// 9. Increases the text’s font size as much as possible (with a safety margin equal to 1% of canvas height)
//    so that the text fills the textbox without overflowing.
// 10. Converts the text layer into a Smart Object.
// 11. Resizes the Smart Object (anchored at its top‐left) so that its bottom border is exactly 0.025×canvas height above the canvas bottom.
// 12. Adjusts the canvas width (from the right) so that the canvas’s right border is 0.025×(width of visible black area) away from the Smart Object.

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
    // New canvas dimensions: width = 3× original width, height remains the same.
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
    textLayer.textItem.font = "Helvetica-BoldOblique";
    textLayer.textItem.size = new UnitValue(60, "px");
    textLayer.textItem.antiAliasMethod = AntiAlias.SHARP; 
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // ---------- NEW STEP: Increase the font size as much as possible without overflowing.
    // Here we use a safety margin equal to 1% of the canvas height.
    function maximizeFontSizeToFillTextBox(layer, containerX, containerY, containerWidth, containerHeight) {
        var bottomSafetyMargin = 0.01 * origHeight;  // 1% of the canvas height as safety margin.
        // Get the initial bounds to determine the vertical offset.
        var initialBounds = layer.bounds;  // [left, top, right, bottom]
        var offsetY = initialBounds[1].as("px") - containerY;
        // Compute an adjusted container bottom using the offset and subtract the safety margin.
        var adjustedContainerBottom = containerY + containerHeight + offsetY - bottomSafetyMargin;

        var currentSize = parseFloat(layer.textItem.size.as("px"));
        while (true) {
            // Increase the font size by 1px.
            layer.textItem.size = new UnitValue(currentSize + 1, "px");

            // Get the updated bounds of the text.
            var b = layer.bounds;
            var bottom = b[3].as("px");

            // If the new bottom exceeds the adjusted container bottom, revert and exit.
            if (bottom > adjustedContainerBottom) {
                layer.textItem.size = new UnitValue(currentSize, "px");
                break;
            }
            currentSize = currentSize + 1;
        }
    }

    maximizeFontSizeToFillTextBox(textLayer, textX, textY, textWidth, textHeight);

    // ---------- Step 10. Convert the text layer into a Smart Object.
    doc.activeLayer = textLayer;
    function convertLayerToSmartObject() {
        var idnewPlacedLayer = stringIDToTypeID("newPlacedLayer");
        executeAction(idnewPlacedLayer, undefined, DialogModes.NO);
    }
    convertLayerToSmartObject();
    // Now, the active layer is the Smart Object.
    var smartObj = doc.activeLayer;

    // ---------- Step 11. Resize the Smart Object while maintaining its top and left borders.
    // We want its bottom border to be exactly marginVert above the bottom of the canvas.
    var smartBounds = smartObj.bounds;
    var currentSmartHeight = smartBounds[3].as("px") - smartBounds[1].as("px");
    var desiredSmartHeight = origHeight - 2 * marginVert;  // since textY is marginVert

    // Calculate the scale factor (in percentage) required to achieve the desired height.
    var scaleFactor = (desiredSmartHeight / currentSmartHeight) * 100;

    // Resize the Smart Object. Anchor at TOPLEFT to keep the left and top positions unchanged.
    smartObj.resize(scaleFactor, scaleFactor, AnchorPosition.TOPLEFT);

    // ---------- Step 12. Adjust the canvas width from the right side.
    // After resizing the Smart Object, determine its new right border.
    smartBounds = smartObj.bounds;
    var objectRight = smartBounds[2].as("px");

    // The visible black area originally spans 2×origWidth.
    // We want the canvas’s right border to be:
    //    objectRight + (0.025 × (width of visible black area)).
    var desiredRightMargin = 0.025 * (2 * origWidth);
    var newCanvasWidth = objectRight + desiredRightMargin;

    // Resize the canvas width while anchoring at the top-left.
    doc.resizeCanvas(new UnitValue(newCanvasWidth, "px"), doc.height, AnchorPosition.TOPLEFT);

    alert("All steps completed:\n• Image repositioned and background filled\n• Multi-paragraph text box created with maximized text\n• Text layer converted to Smart Object and resized\n• Canvas width adjusted accordingly!");
})();

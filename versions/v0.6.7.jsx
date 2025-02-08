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
// 9. Auto-adjusts the font size (via binary search) so that the text completely fills the text box
//    without overflowing it. A final loop then reduces the font size (if needed) to guarantee that
//    no text is cut off at the bottom.
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
    // New canvas dimensions: width = 3 × original width; height remains the same.
    // Anchor at TOPLEFT so the image remains at the top-left.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // ---------- Step 4. Process the image layer.
    // If the current layer is a background layer (locked), duplicate it so it can be moved.
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
    
    // ---------- Step 6. Get ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust the size as needed.
        var buttonGroup = dlg.add("group");
        buttonGroup.alignment = "right";
        var okButton = buttonGroup.add("button", undefined, "OK");
        okButton.onClick = function() { dlg.close(); };
        dlg.show();
        return inputField.text;
    }
    
    var chatGPTOutput = getChatGPTOutput();
    if (chatGPTOutput === "") {
        chatGPTOutput = "No output provided.";
    } else {
        // Replace newline characters with carriage returns so Photoshop treats them as paragraph breaks.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // ---------- Step 7. Create a text box with dynamic margins in the visible (black) area.
    // The visible (black) area is the right 2× the original width of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);
    
    // Calculate the text box position and size.
    var textX = origWidth + marginHoriz;                // X position inside the black area.
    var textY = marginVert;                             // Y position (from the top).
    var textWidth = (2 * origWidth) - (2 * marginHoriz);  // Available width inside the black area.
    var textHeight = origHeight - (2 * marginVert);       // Available height.
    
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
    // (Change these values as needed.)
    textLayer.textItem.font = "Helvetica-BoldOblique"; // Change to your desired font.
    textLayer.textItem.size = new UnitValue(60, "px");    // Initial font size.
    // Set anti-aliasing to Sharp.
    try {
        textLayer.textItem.antiAliasMethod = AntiAlias.SHARP;
    } catch (e) {
        try {
            textLayer.textItem.antiAliasMethod = "Sharp";
        } catch(e2) {
            // If both fail, alert the error (or you could leave it unset).
            alert("Failed to set anti-aliasing.");
        }
    }
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // ---------- Step 8. Auto-adjust the font size so that the text completely fills the text box but does not overflow.
    // This function uses a binary search approach to find the maximum font size that fits within the textbox.
    function adjustFontSizeToFillBox(layer, boxWidth, boxHeight, tolerance) {
        tolerance = tolerance || 1; // in pixels
        // Save the current font size as the starting lower bound.
        var low = parseFloat(layer.textItem.size.as("px"));
        var high = low;
        // Increase the high bound until the text overflows the box.
        var b = layer.bounds;
        var renderedWidth = b[2].as("px") - b[0].as("px");
        var renderedHeight = b[3].as("px") - b[1].as("px");
        while (renderedWidth <= boxWidth && renderedHeight <= boxHeight) {
            high *= 2;
            layer.textItem.size = new UnitValue(high, "px");
            layer.textItem.leading = new UnitValue(high, "px");
            b = layer.bounds;
            renderedWidth = b[2].as("px") - b[0].as("px");
            renderedHeight = b[3].as("px") - b[1].as("px");
            if (high > 1000) break;
        }
        var bestSize = low;
        // Perform binary search for up to 20 iterations.
        for (var i = 0; i < 20; i++) {
            var mid = (low + high) / 2;
            layer.textItem.size = new UnitValue(mid, "px");
            layer.textItem.leading = new UnitValue(mid, "px");
            b = layer.bounds;
            renderedWidth = b[2].as("px") - b[0].as("px");
            renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedWidth <= boxWidth && renderedHeight <= boxHeight) {
                bestSize = mid;
                low = mid;
            } else {
                high = mid;
            }
            if ((high - low) < tolerance) break;
        }
        // Set the final font size and matching leading.
        layer.textItem.size = new UnitValue(bestSize, "px");
        layer.textItem.leading = new UnitValue(bestSize, "px");
    }
    
    adjustFontSizeToFillBox(textLayer, textWidth, textHeight, 1);
    
    // Final check: If the text still overflows vertically, reduce font size further.
    var finalBounds = textLayer.bounds;
    var finalRenderedHeight = finalBounds[3].as("px") - finalBounds[1].as("px");
    while (finalRenderedHeight > textHeight) {
        var currentSize = parseFloat(textLayer.textItem.size.as("px"));
        textLayer.textItem.size = new UnitValue(currentSize - 1, "px");
        textLayer.textItem.leading = new UnitValue(currentSize - 1, "px");
        finalBounds = textLayer.bounds;
        finalRenderedHeight = finalBounds[3].as("px") - finalBounds[1].as("px");
    }
    
    alert("Canvas resized, image repositioned, and text box created with auto-adjusted text size to fill the box without overflowing.");
})();

// ===== AutoResizePlaceAndTextFillTextBox.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Displays a custom multiline ScriptUI dialog to paste your ChatGPT output.
// 7. Replaces newline characters with carriage returns so Photoshop shows multiple paragraphs.
// 8. Creates a text box in the visible black area with dynamic margins.
// 9. Adjusts the font size so the text fits without overflowing, and then
//    (if needed) vertically scales the text layer so it fills the text box without leaving a large empty gap at the bottom.

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
    // Anchor at TOPLEFT so the image remains in the upper-left.
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

    // Move the image layer so its top-left corner is exactly at (0,0).
    var bounds = imageLayer.bounds; // [left, top, right, bottom]
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
    textLayer.textItem.size = new UnitValue(24, "px"); // Starting font size.
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // ---------- Step 8. Adjust the font size so the text fits and then (if needed) fill the box vertically.
    // This function first uses a binary search to find the maximum font size that does not cause overflow.
    // Then, if there is a significant gap (more than 5 pixels) between the rendered text height and the text box,
    // it applies a vertical scaling to the text layer so that it fills the available space.
    function adjustFontSizeToFill(layer, maxWidth, maxHeight) {
        var low = 1;
        var high = 500; // an arbitrary high bound
        var bestSize = low;
        // Use binary search to get as close as possible without overflowing.
        while (high - low > 0.1) {
            var mid = (low + high) / 2;
            layer.textItem.size = new UnitValue(mid, "px");
            var b = layer.bounds;
            var renderedWidth = b[2].as("px") - b[0].as("px");
            var renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedWidth <= maxWidth && renderedHeight <= maxHeight) {
                bestSize = mid;
                low = mid;
            } else {
                high = mid;
            }
        }
        // Set the font size to the best found value.
        layer.textItem.size = new UnitValue(bestSize, "px");
        
        // Now measure the rendered height.
        var b = layer.bounds;
        var renderedHeight = b[3].as("px") - b[1].as("px");
        var gap = maxHeight - renderedHeight;
        
        // If there is a significant gap (more than 5 pixels), apply vertical scaling.
        if (gap > 5) {
            var verticalScale = (maxHeight / renderedHeight) * 100; // percentage
            // Resize vertically only; horizontal scale remains 100%
            layer.resize(100, verticalScale, AnchorPosition.TOPLEFT);
        }
    }

    // Adjust the font size (and apply vertical scaling if needed) so the text fills the text box.
    adjustFontSizeToFill(textLayer, textWidth, textHeight);

    alert("Canvas resized, image repositioned, and text box added with auto-adjusted text size!");
})();

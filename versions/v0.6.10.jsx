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
// 9. Auto-adjusts the font size so that all text is visible in the textbox and is as big as possible without overflowing.
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
    // New canvas dimensions: width = 3× original width; height remains the same.
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
    // Move the image layer so its top-left corner is at (0,0).
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

    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");

    // ---------- Set text formatting as requested.
    // Font: Helvetica-BoldOblique, Font Size: (start with 60px), Anti-Aliasing: Sharp, Color: white (#FFFF).
    textLayer.textItem.font = "Helvetica-BoldOblique";
    textLayer.textItem.size = new UnitValue(60, "px");
    try {
        textLayer.textItem.antiAliasMethod = AntiAlias.SHARP;
    } catch (e) {
        try {
            textLayer.textItem.antiAliasMethod = "Sharp";
        } catch(e2) {
            // If setting fails, it remains unchanged.
        }
    }
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // ---------- Step 8. Auto-adjust the font size so that all text fits within the text box and is as big as possible.
    // This function uses a binary search approach, then a final iterative loop to maximize font size.
    function adjustFontSizeToFillBox(layer, boxWidth, boxHeight, tolerance) {
        tolerance = tolerance || 1; // in pixels

        // Get the current font size as the starting lower bound.
        var low = parseFloat(layer.textItem.size.as("px"));
        var high = low;
        var b = layer.bounds;
        var renderedWidth = b[2].as("px") - b[0].as("px");
        var renderedHeight = b[3].as("px") - b[1].as("px");

        // Increase the high bound until the text overflows the text box.
        while (renderedWidth <= boxWidth && renderedHeight <= boxHeight) {
            low = high;
            high *= 2;
            layer.textItem.size = new UnitValue(high, "px");
            layer.textItem.leading = new UnitValue(high, "px");
            b = layer.bounds;
            renderedWidth = b[2].as("px") - b[0].as("px");
            renderedHeight = b[3].as("px") - b[1].as("px");
            if (high > 1000) break;
        }
        var bestSize = low;
        // Binary search for maximum size that fits.
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
        // Set the text to the best size.
        layer.textItem.size = new UnitValue(bestSize, "px");
        layer.textItem.leading = new UnitValue(bestSize, "px");

        // Final check: if the text overflows vertically, reduce size one pixel at a time.
        b = layer.bounds;
        renderedHeight = b[3].as("px") - b[1].as("px");
        while (renderedHeight > boxHeight) {
            bestSize -= 1;
            layer.textItem.size = new UnitValue(bestSize, "px");
            layer.textItem.leading = new UnitValue(bestSize, "px");
            b = layer.bounds;
            renderedHeight = b[3].as("px") - b[1].as("px");
        }
        // Next, try to increase size gradually until just before overflow.
        var canIncrease = true;
        while (canIncrease) {
            var testSize = bestSize + 1;
            layer.textItem.size = new UnitValue(testSize, "px");
            layer.textItem.leading = new UnitValue(testSize, "px");
            b = layer.bounds;
            renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedHeight > boxHeight) {
                // Revert to previous size and break.
                layer.textItem.size = new UnitValue(bestSize, "px");
                layer.textItem.leading = new UnitValue(bestSize, "px");
                canIncrease = false;
            } else {
                bestSize = testSize;
            }
        }
    }
    
    adjustFontSizeToFillBox(textLayer, textWidth, textHeight, 1);

    alert("Canvas resized, image repositioned, and text box created with auto-adjusted text size so that all text is visible without overflowing.");
})();

// ===== AutoResizePlaceAndText_FillTextBox_BinarySearchSimple.jsx =====
// This script does the following:
// 1. Sets up the canvas (resizing it to 3× the original width) and moves the image layer to the top‐left.
// 2. Fills the extra (canvas) area with black.
// 3. Displays a ScriptUI dialog so you can paste your multi‐paragraph ChatGPT output
//    (newline characters are replaced by carriage returns so Photoshop interprets them as paragraph breaks).
// 4. Creates a paragraph text layer (“text box”) in the extra (black) area using dynamic margins.
// 5. Uses a binary search to adjust the font size (with leading fixed equal to the font size)
//    so that the rendered text height nearly equals the text box height (within a tolerance),
//    thereby eliminating large empty space below the text.
(function() {
    // --- Step 1. Set the background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;

    // --- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");

    // --- Step 3. Resize the canvas: new width = 3 × original width (height remains unchanged).
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);

    // --- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it so that it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    var imgBounds = imageLayer.bounds; // [left, top, right, bottom]
    var deltaX = -imgBounds[0].as("px");
    var deltaY = -imgBounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);

    // --- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);

    // --- Step 6. Get the ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];

        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust if needed

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
        // Replace newline characters with carriage returns so Photoshop creates separate paragraphs.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }

    // --- Step 7. Create a text box in the visible (black) area.
    // The visible (black) area occupies the right 2×origWidth of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);
    var textX = origWidth + marginHoriz;               // X position inside black area.
    var textY = marginVert;                            // Y position from the top.
    var textWidth = (2 * origWidth) - (2 * marginHoriz); // Available width.
    var textHeight = origHeight - (2 * marginVert);      // Available height.

    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");

    // Set initial text formatting.
    textLayer.textItem.font = "ArialMT";             // Change to your preferred font.
    textLayer.textItem.size = new UnitValue(24, "px");   // Starting font size.
    textLayer.textItem.autoLeading = false;            // Disable auto-leading.
    textLayer.textItem.leading = new UnitValue(24, "px"); // Set leading equal to font size.
    var textColor = new SolidColor();
    textColor.rgb.red = 255;  textColor.rgb.green = 255;  textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;

    // --- Step 8. Use binary search to adjust the font size so that the rendered text height
    // nearly equals the text box height (within a tolerance).
    function adjustFontSizeBinary(layer, targetHeight, iterations, tolerance) {
        // Make sure auto-leading is disabled.
        layer.textItem.autoLeading = false;
        // Define low and high font size boundaries.
        var low = 1;
        // Start with current size as a lower bound.
        var currentSize = parseFloat(layer.textItem.size.as("px"));
        var high = currentSize * 2;
        // Increase 'high' until the rendered text height overflows targetHeight.
        while (true) {
            layer.textItem.size = new UnitValue(high, "px");
            layer.textItem.leading = new UnitValue(high, "px");
            var b = layer.bounds;
            var renderedHeight = b[3].as("px") - b[1].as("px");
            if (renderedHeight > targetHeight || high > 2000) { break; }
            high *= 2;
        }
        var bestSize = low;
        for (var i = 0; i < iterations; i++) {
            var mid = (low + high) / 2;
            layer.textItem.size = new UnitValue(mid, "px");
            layer.textItem.leading = new UnitValue(mid, "px");
            var b = layer.bounds;
            var renderedHeight = b[3].as("px") - b[1].as("px");
            if (Math.abs(renderedHeight - targetHeight) < tolerance) {
                bestSize = mid;
                break;
            }
            if (renderedHeight < targetHeight) {
                bestSize = mid;
                low = mid;
            } else {
                high = mid;
            }
        }
        // Set the final font size (and leading) to the best found value.
        layer.textItem.size = new UnitValue(bestSize, "px");
        layer.textItem.leading = new UnitValue(bestSize, "px");
    }
    
    // Call the binary search function with, for example, 20 iterations and a 2‑pixel tolerance.
    adjustFontSizeBinary(textLayer, textHeight, 20, 2);
    
    // --- Final horizontal overflow check:
    var finalBounds = textLayer.bounds;
    var finalRenderedWidth = finalBounds[2].as("px") - finalBounds[0].as("px");
    if (finalRenderedWidth > textWidth) {
        var currentSize = parseFloat(textLayer.textItem.size.as("px"));
        textLayer.textItem.size = new UnitValue(currentSize - 1, "px");
        textLayer.textItem.leading = new UnitValue(currentSize - 1, "px");
    }
    
    alert("Canvas resized, image repositioned, and text box adjusted to nearly fill vertically!");
})();

// ===== AutoResizePlaceAndTextMultiParagraph_FitAllText.jsx =====
// This script:
// 1. Sets the canvas background to black.
// 2. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 3. Moves the image layer so its top‐left is at (0,0) and fills the extra area with black.
// 4. Prompts you for your multi‐paragraph ChatGPT output (converting newlines to carriage returns).
// 5. Creates a paragraph text layer (a textbox) in the extended (black) area with a fixed margin.
// 6. Then, to ensure that all text fits in the textbox, it duplicates the paragraph text layer,
//    converts the duplicate to point text (which is not clipped), and iteratively reduces the
//    font size until the full text’s rendered height is less than or equal to the textbox height.
// 7. Finally, it applies that font size to the original text layer and deletes the duplicate.
(function() {
    // ----- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // ----- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var origWidth = doc.width.as("px");
    var origHeight = doc.height.as("px");
    
    // ----- Step 3. Resize the canvas.
    // New width = 3 × original width; height remains unchanged.
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // ----- Step 4. Process the image layer.
    // If the active layer is a background (locked) layer, duplicate it so it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    // Move the image layer so its top‐left corner is at (0,0).
    var bounds = imageLayer.bounds; // [left, top, right, bottom]
    var deltaX = -bounds[0].as("px");
    var deltaY = -bounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);
    
    // ----- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);
    
    // ----- Step 6. Get ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300]; // Adjust as needed.
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
    
    // ----- Step 7. Create a textbox (paragraph text layer) in the extended (black) area.
    // For this version, we use a fixed 20‑pixel margin on all sides.
    var margin = 20;
    var textX = origWidth + margin;
    var textY = margin;
    var textWidth = (2 * origWidth) - (2 * margin);
    var textHeight = origHeight - (2 * margin);
    
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");
    
    // Set initial formatting.
    textLayer.textItem.font = "ArialMT";           // Change to desired font.
    textLayer.textItem.size = new UnitValue(24, "px"); // Starting font size.
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // ----- Step 8. Adjust the font size so that all text fits within the textbox.
    // Because paragraph text is clipped to the textbox size, we cannot directly read its full extents.
    // Instead, we duplicate the text layer, convert it to point text (which is not clipped),
    // and then measure its full height. If the full height is greater than the textbox height,
    // we reduce the font size until it fits.
    function adjustTextToFit(layer, textboxHeight) {
        // Duplicate the paragraph text layer.
        var dupLayer = layer.duplicate();
        // Convert the duplicate to point text.
        dupLayer.convertToPointText();
        // Measure the duplicate's rendered text height.
        var dupBounds = dupLayer.bounds;
        var dupHeight = dupBounds[3].as("px") - dupBounds[1].as("px");
        var iterations = 0;
        // Reduce font size until the full text height is less than or equal to the textbox height.
        while (dupHeight > textboxHeight && iterations < 100) {
            var currentSize = parseFloat(dupLayer.textItem.size.as("px"));
            var newSize = currentSize - 1;
            if (newSize < 1) break;
            dupLayer.textItem.size = new UnitValue(newSize, "px");
            dupLayer.textItem.leading = new UnitValue(newSize, "px");
            dupBounds = dupLayer.bounds;
            dupHeight = dupBounds[3].as("px") - dupBounds[1].as("px");
            iterations++;
        }
        // Now update the original paragraph text layer to use this final font size.
        var finalSize = dupLayer.textItem.size;
        layer.textItem.size = finalSize;
        layer.textItem.leading = finalSize;
        // Delete the duplicate.
        dupLayer.remove();
    }
    
    adjustTextToFit(textLayer, textHeight);
    
    alert("Canvas resized, image repositioned, and textbox created with all text fitting.");
})();

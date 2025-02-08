// ===== AutoResizePlaceAndTextMultiParagraph_SmartObjectFitAdvanced.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Retrieves the document's dimensions.
// 3. Resizes the canvas to 3× the original width (anchored at the top-left).
// 4. Moves the image layer so its top-left is at (0,0).
// 5. Fills the extended canvas area with black.
// 6. Displays a custom multiline ScriptUI dialog to paste your ChatGPT output.
// 7. Replaces newline characters with carriage returns so Photoshop shows multiple paragraphs.
// 8. Creates a text box in the visible black area with dynamic margins.
// 9. Converts the text box to a Smart Object.
// 10. Uniformly scales the Smart Object so that its height equals 95% of the original document height
//     (i.e. its top is 0.025×height from the top and its bottom is 0.025×height from the bottom).
// 11. Adjusts the canvas width (and the visible black area) horizontally so that the right border of the canvas
//     is exactly 0.05×(original width) away from the right edge of the Smart Object.
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
    doc.resizeCanvas(UnitValue(origWidth * 3, "px"), UnitValue(origHeight, "px"), AnchorPosition.TOPLEFT);
    
    // ---------- Step 4. Process the image layer.
    // If the current layer is a background layer (locked), duplicate it.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    // Move the image layer so its top-left corner is at (0,0).
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
    
    // ---------- Step 6. Get ChatGPT conversation output via a custom multiline ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300];
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
        // Replace newline characters with carriage returns.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // ---------- Step 7. Create a text box with dynamic margins in the visible (black) area.
    // The visible (black) area is the right 2×origWidth of the canvas.
    // Define margins:
    //    Vertical margin = 0.025 × origHeight
    //    Horizontal margin = 0.025 × (2 × origWidth)
    var marginVert = 0.025 * origHeight;
    var marginHoriz = 0.025 * (2 * origWidth);
    
    // Calculate text box position and size.
    var textX = origWidth + marginHoriz;
    var textY = marginVert;
    var textWidth = (2 * origWidth) - (2 * marginHoriz);
    var textHeight = origHeight - (2 * marginVert);
    
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    textLayer.textItem.position = [new UnitValue(textX, "px"), new UnitValue(textY, "px")];
    textLayer.textItem.width = new UnitValue(textWidth, "px");
    textLayer.textItem.height = new UnitValue(textHeight, "px");
    
    // ---------- Set initial text formatting.
    // (For this example, we retain the previous formatting for the text box.)
    textLayer.textItem.font = "Helvetica-BoldOblique";
    textLayer.textItem.size = new UnitValue(60, "px");
    try {
        textLayer.textItem.antiAliasMethod = AntiAlias.SHARP;
    } catch(e) {
        try {
            textLayer.textItem.antiAliasMethod = "Sharp";
        } catch(e2) {
            // Leave unchanged if setting fails.
        }
    }
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // ---------- Step 8. Convert the text box to a Smart Object.
    doc.activeLayer = textLayer;
    var idNewPlacedLayer = stringIDToTypeID("newPlacedLayer");
    executeAction(idNewPlacedLayer, undefined, DialogModes.NO);
    
    // ---------- Step 9. Scale the Smart Object uniformly so that its height equals 0.95×origHeight.
    // That is, the object's top border will remain at y = marginVert and its bottom border will be at y = origHeight - marginVert.
    var smartLayer = doc.activeLayer; // now the smart object layer
    var smartBounds = smartLayer.bounds; // [left, top, right, bottom]
    var currentSmartHeight = smartBounds[3].as("px") - smartBounds[1].as("px");
    var desiredSmartHeight = 0.95 * origHeight;
    var scaleFactor = (desiredSmartHeight / currentSmartHeight) * 100; // as a percentage

    // Perform a free transform scale anchored at the top-left.
    var idTrnf = charIDToTypeID("Trnf");
    var desc = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref = new ActionReference();
    var idLyr = charIDToTypeID("Lyr ");
    ref.putIdentifier(idLyr, smartLayer.id);
    desc.putReference(idnull, ref);
    var idFTcs = charIDToTypeID("FTcs");
    var idQCSt = charIDToTypeID("QCSt");
    var idQcs0 = charIDToTypeID("Qcs0"); // top-left as reference point
    desc.putEnumerated(idFTcs, idQCSt, idQcs0);
    var idScl = charIDToTypeID("Scl ");
    desc.putUnitDouble(idScl, charIDToTypeID("#Prc"), scaleFactor);
    executeAction(idTrnf, desc, DialogModes.NO);

    // ---------- Step 10. Adjust the canvas width and visible black area horizontally.
    // After scaling, we want the right border of the smart object to be exactly 0.05×origWidth away from the right edge of the canvas.
    // The desired right margin = 0.05 * origWidth.
    // Let object's right border be X. We want new canvas width = X + (0.05 * origWidth).
    smartBounds = smartLayer.bounds;
    var smartRight = smartBounds[2].as("px");
    var desiredMarginRight = 0.05 * origWidth;
    var newCanvasWidth = smartRight + desiredMarginRight;
    // Resize canvas horizontally (keeping the top-left anchored).
    doc.resizeCanvas(UnitValue(newCanvasWidth, "px"), doc.height, AnchorPosition.TOPLEFT);

    alert("Canvas resized, image repositioned, and text adjusted via Smart Object scaling.\n" +
          "The text object's height is exactly 95% of the canvas height, and the right margin is adjusted accordingly.");
})();

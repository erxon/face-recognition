async function loadModels() {
  const MODEL_URL = "/models";

  await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
  await faceapi.loadFaceLandmarkModel(MODEL_URL);
  await faceapi.loadFaceRecognitionModel(MODEL_URL);
  await faceapi.loadAgeGenderModel(MODEL_URL);
}

loadModels().then(async () => {
  console.log("start");
  const input = document.getElementById("myImage");
  const canvas = document.getElementById("overlay");
  const displaySize = { width: input.width, height: input.height };
  faceapi.matchDimensions(canvas, displaySize);
  let fullFaceDescriptions = await faceapi
    .detectAllFaces(input)
    .withFaceLandmarks()
    .withFaceDescriptors()
    .withAgeAndGender();

  fullFaceDescriptions.forEach((result) => {
    const { age, gender, genderProbability } = result;
    new faceapi.draw.DrawTextField(
      [
        `${faceapi.utils.round(age, 0)} years`,
        `${gender} (${faceapi.utils.round(genderProbability)})`,
      ],
      result.detection.box.bottomLeft
    ).draw(canvas);
  });

  const labels = ["elon", "bill", "jeff", "robert_downey", "chris_evans"];

  const labeledFaceDescriptors = await Promise.all(
    labels.map(async (label) => {
      // fetch image data from urls and convert blob to HTMLImage element
      const imgUrl = `/photos/${label}/${label}.png`;
      const img = await faceapi.fetchImage(imgUrl);

      // detect the face with the highest score in the image and compute it's landmarks and face descriptor
      const fullFaceDescription = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender();

      if (!fullFaceDescription) {
        throw new Error(`no faces detected for ${label}`);
      }

      const faceDescriptors = [fullFaceDescription.descriptor];
      return new faceapi.LabeledFaceDescriptors(
        `${label} ${fullFaceDescription.age}`,
        faceDescriptors
      );
    })
  );

  const maxDescriptorDistance = 0.6;
  const faceMatcher = new faceapi.FaceMatcher(
    labeledFaceDescriptors,
    maxDescriptorDistance
  );
  const results = fullFaceDescriptions.map((fd) =>
    faceMatcher.findBestMatch(fd.descriptor)
  );

  results.forEach((bestMatch, i) => {
    const box = fullFaceDescriptions[i].detection.box;
    const text = bestMatch.toString();
    const drawBox = new faceapi.draw.DrawBox(box, { label: text });
    drawBox.draw(canvas);
  });
});

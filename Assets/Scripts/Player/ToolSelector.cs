using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Player
{
    public class ToolSelector : MonoBehaviour
    {
    
        [SerializeField] private List<GameObject> tools;
        private PlayerInput playerInput;

        private int toolIndex;

        [Header("FMODStuff")]
        public FMODUnity.EventReference toolSelectorSound;
        public FMOD.Studio.EventInstance toolSelectorSoundInstance;
        FMOD.Studio.PARAMETER_ID toolSelectorParamId;  
        string toolParamID = "ToolSet";
        public int toolSetValue;



        // Start is called before the first frame update

        private void Awake()
        {
            playerInput = new PlayerInput();
        }

        private void OnEnable()
        {
            playerInput.Enable();
            playerInput.Player.Switch.performed += HandleSelectTools;
        }

        private void OnDisable()
        {
            playerInput.Disable();
            playerInput.Player.Switch.performed -= HandleSelectTools;
            PlayToolSound();
        }

        private void HandleSelectTools(InputAction.CallbackContext callback)
        {
            var inputValue = (int)callback.ReadValue<float>();
            tools[toolIndex].SetActive(false);
        
            toolIndex = (toolIndex + inputValue) % tools.Count;
        
            // To prevent index is out of the bounds and continue to be able to select tools with reverse arrow
            if (toolIndex < 0)
            {
                toolIndex += tools.Count;
            }
            tools[toolIndex].SetActive(true);
        }

        public int GetToolIndex()
        {
            return toolIndex;
        }

        public void PlayToolSound(){

            //0= Brush, 1 = Camera, Ultralight = 2, Bug Spray = 3, Tool Switch = 4, Idle = 5

            toolSetValue = toolIndex; 
            toolSelectorSoundInstance = FMODUnity.RuntimeManager.CreateInstance(toolSelectorSound);
            toolSelectorSoundInstance = setParameterByID(toolParamID, toolSetValue);
            toolSelectorSoundInstance.start();

        }

        // void InitializeFMOD(){

        //     FMOD.Studio.EventDescription toolSwitchEventDescrip = FMODUnity.RuntimeManager.GetEventDescription(toolSelectorSound);
        //     FMOD.Studio.PARAMETER_DESCRIPTION toolswitchParameterDescription;
        //     toolSwitchEventDescrip.getParameterDescriptionByName(toolParam, out toolswitchParameterDescription);

        //     toolSelectorParamId = toolswitchParameterDescription.id;
        // }


    }
  
}

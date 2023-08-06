using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Player
{
    public class ToolSelector : MonoBehaviour
    {
    
        [SerializeField] private List<GameObject> tools;
        private PlayerInput playerInput;
        public FMODUnity.EventReference toolswitchEvent;
        public FMOD.Studio.EventInstance toolswitchInstance;

        private int toolIndex;
        // Start is called before the first frame update

        private void Awake()
        {
            playerInput = new PlayerInput();
            
        }

          
        

        private void OnEnable()
        {
            playerInput.Enable();
            playerInput.Player.Switch.performed += HandleSelectTools;
            toolswitchInstance = FMODUnity.RuntimeManager.CreateInstance(toolswitchEvent);
            
        }

        private void OnDisable()
        {
            playerInput.Disable();
            playerInput.Player.Switch.performed -= HandleSelectTools;
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
            toolswitchInstance.start();
            tools[toolIndex].SetActive(true);
        }

        public int GetToolIndex()
        {
            return toolIndex;
        }
    }
}

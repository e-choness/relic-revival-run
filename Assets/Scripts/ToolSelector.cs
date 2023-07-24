using System;
using System.Collections;
using System.Collections.Generic;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.InputSystem;

public class ToolSelector : MonoBehaviour
{
    [SerializeField] private List<GameObject> tools;
    [SerializeField] InputActionAsset playerInputActionAsset;
    private InputActionMap _playerInputActionMap;
    private InputAction _selectToolsInputAciton;

    private int m_ToolIndex = 0;
    // Start is called before the first frame update

    private void Awake()
    {
        _playerInputActionMap = playerInputActionAsset.FindActionMap("Player");
        _selectToolsInputAciton = _playerInputActionMap.FindAction("Switch");
    }

    private void OnEnable()
    {
        _selectToolsInputAciton.Enable();
        _selectToolsInputAciton.performed += HandleSelectTools;
    }

    private void OnDisable()
    {
        _selectToolsInputAciton.Disable();
        _selectToolsInputAciton.performed -= HandleSelectTools;
    }

    private void HandleSelectTools(InputAction.CallbackContext context)
    {
        var input_value = (int)context.ReadValue<float>();
        
#if UNITY_EDITOR
        Debug.Log($"Tools index: {m_ToolIndex.ToString()}");
#endif
        tools[m_ToolIndex].SetActive(false);
        
        m_ToolIndex = (m_ToolIndex + input_value) % tools.Count;
        
        // To prevent index is out of the bounds and continue to be able to select tools with reverse arrow
        if (m_ToolIndex < 0)
        {
            m_ToolIndex += tools.Count;
        }
        
        tools[m_ToolIndex].SetActive(true);
    }

    public int GetToolIndex()
    {
        return m_ToolIndex;
    }
}
